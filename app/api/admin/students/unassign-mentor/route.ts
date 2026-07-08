import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { deleteZoomMeeting } from '@/utils/zoom'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await req.json().catch(() => null)
        const studentId = body?.student_id as string | undefined
        const mentorId = body?.mentor_id as string | undefined

        if (!studentId || !mentorId) {
            return NextResponse.json(
                { error: 'student_id and mentor_id are required' },
                { status: 400 }
            )
        }

        const { data: assignment } = await adminSupabase
            .from('student_mentor_assignments')
            .select('id')
            .eq('student_id', studentId)
            .eq('mentor_id', mentorId)
            .eq('is_current', true)
            .maybeSingle()

        if (!assignment) {
            return NextResponse.json(
                { error: 'This mentor is not currently assigned to that student.' },
                { status: 400 }
            )
        }

        // 1. Retire this specific assignment only. Other mentors assigned to
        //    the same student are untouched.
        await adminSupabase
            .from('student_mentor_assignments')
            .update({ is_current: false, ended_at: new Date().toISOString() })
            .eq('id', assignment.id)

        // 2. Clean slate for this pair: cancel pending requests and upcoming
        //    sessions between this student and this mentor only.
        await adminSupabase
            .from('mentorship_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('student_id', studentId)
            .eq('mentor_id', mentorId)
            .eq('status', 'pending')

        const nowIso = new Date().toISOString()
        const { data: upcomingSessions } = await adminSupabase
            .from('sessions')
            .select('id, zoom_meeting_id, scheduled_at')
            .eq('student_id', studentId)
            .eq('mentor_id', mentorId)
            .eq('status', 'active')

        const toCancel = (upcomingSessions || []).filter(
            (s: any) => !s.scheduled_at || new Date(s.scheduled_at) > new Date(nowIso)
        )

        if (toCancel.length > 0) {
            await adminSupabase
                .from('sessions')
                .update({ status: 'cancelled', updated_at: nowIso })
                .in('id', toCancel.map((s: any) => s.id))

            // Best-effort: tear down the Zoom meetings for cancelled sessions.
            for (const s of toCancel) {
                if (s.zoom_meeting_id) {
                    await deleteZoomMeeting(s.zoom_meeting_id)
                }
            }
        }

        // 3. Notify student + removed mentor. The conversation history is
        //    kept intact so past messages remain accessible.
        const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', [studentId, mentorId])

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
        const studentProfile = profileMap.get(studentId)
        const mentorProfile = profileMap.get(mentorId)

        const studentName = studentProfile?.full_name || 'the student'
        const mentorName = mentorProfile?.full_name || 'the mentor'

        const notifications: any[] = []

        if (studentProfile?.email) {
            notifications.push({
                recipient_id: studentId,
                recipient_email: studentProfile.email,
                type: 'system_alert' as const,
                title: 'A mentor has been unassigned',
                message: `${mentorName} is no longer one of your assigned mentors. Any pending requests and upcoming sessions with them have been cancelled.`,
                data: {
                    student_id: studentId,
                    removed_mentor_id: mentorId,
                },
            })
        }

        if (mentorProfile?.email) {
            notifications.push({
                recipient_id: mentorId,
                recipient_email: mentorProfile.email,
                type: 'system_alert' as const,
                title: 'A student has been unassigned',
                message: `${studentName} is no longer assigned to you. Any pending requests and upcoming sessions with them have been cancelled.`,
                data: {
                    student_id: studentId,
                    removed_mentor_id: mentorId,
                },
            })
        }

        if (notifications.length > 0) {
            await adminSupabase.from('notifications').insert(notifications)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Unassign mentor error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to unassign mentor' },
            { status: 500 }
        )
    }
}
