import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { deleteZoomMeeting } from '@/utils/zoom'
import { sendEmail, EMAIL_SENDER_CLAIRE } from '@/lib/email/client'
import { studentMatched, mentorMatched } from '@/lib/email/templates'

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
        const newMentorId = body?.mentor_id as string | undefined

        if (!studentId || !newMentorId) {
            return NextResponse.json(
                { error: 'student_id and mentor_id are required' },
                { status: 400 }
            )
        }

        // Current assignment (if any)
        const { data: currentAssignment } = await adminSupabase
            .from('student_mentor_assignments')
            .select('id, mentor_id')
            .eq('student_id', studentId)
            .eq('is_current', true)
            .maybeSingle()

        const oldMentorId = currentAssignment?.mentor_id || null

        if (oldMentorId === newMentorId) {
            return NextResponse.json(
                { error: 'This student is already assigned to that mentor.' },
                { status: 400 }
            )
        }

        // 1. Retire the previous current assignment.
        if (currentAssignment) {
            await adminSupabase
                .from('student_mentor_assignments')
                .update({ is_current: false, ended_at: new Date().toISOString() })
                .eq('id', currentAssignment.id)
        }

        // 2. Create the new current assignment.
        const { error: insertError } = await adminSupabase
            .from('student_mentor_assignments')
            .insert({
                student_id: studentId,
                mentor_id: newMentorId,
                assigned_by: user.id,
                is_current: true,
            })

        if (insertError) {
            return NextResponse.json(
                { error: 'Failed to create mentor assignment' },
                { status: 500 }
            )
        }

        // 3. Clean slate for the OLD mentor: cancel pending requests and upcoming sessions.
        if (oldMentorId) {
            await adminSupabase
                .from('mentorship_requests')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('student_id', studentId)
                .eq('mentor_id', oldMentorId)
                .eq('status', 'pending')

            const nowIso = new Date().toISOString()
            const { data: upcomingSessions } = await adminSupabase
                .from('sessions')
                .select('id, zoom_meeting_id, scheduled_at')
                .eq('student_id', studentId)
                .eq('mentor_id', oldMentorId)
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
        }

        // 4. Ensure a mentor conversation exists so chat is preloaded immediately.
        const { data: existingConv } = await adminSupabase
            .from('conversations')
            .select('id')
            .eq('student_id', studentId)
            .eq('mentor_id', newMentorId)
            .eq('type', 'mentor')
            .maybeSingle()

        if (!existingConv) {
            await adminSupabase.from('conversations').insert({
                student_id: studentId,
                mentor_id: newMentorId,
                type: 'mentor',
            })
        }

        // 5. Notify student + new mentor (+ old mentor if any).
        const ids = [studentId, newMentorId, oldMentorId].filter(Boolean) as string[]
        const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', ids)

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
        const studentProfile = profileMap.get(studentId)
        const newMentorProfile = profileMap.get(newMentorId)
        const oldMentorProfile = oldMentorId ? profileMap.get(oldMentorId) : null

        const studentName = studentProfile?.full_name || 'the student'
        const newMentorName = newMentorProfile?.full_name || 'a mentor'

        const notifications: any[] = []

        if (studentProfile?.email) {
            notifications.push({
                recipient_id: studentId,
                recipient_email: studentProfile.email,
                type: 'system_alert' as const,
                title: 'Your mentor has been assigned',
                message: `You have been assigned to ${newMentorName}. You can now book a session and start chatting with your mentor.`,
                data: {
                    student_id: studentId,
                    new_mentor_id: newMentorId,
                    old_mentor_id: oldMentorId,
                },
            })
        }

        if (newMentorProfile?.email) {
            notifications.push({
                recipient_id: newMentorId,
                recipient_email: newMentorProfile.email,
                type: 'system_alert' as const,
                title: 'You have a new assigned student',
                message: `You have been assigned as the mentor for ${studentName}. They may book a session with you soon.`,
                data: {
                    student_id: studentId,
                    new_mentor_id: newMentorId,
                    old_mentor_id: oldMentorId,
                },
            })
        }

        if (oldMentorProfile?.email) {
            notifications.push({
                recipient_id: oldMentorId,
                recipient_email: oldMentorProfile.email,
                type: 'system_alert' as const,
                title: 'A student has been reassigned',
                message: `${studentName} has been reassigned to another mentor. Any pending requests and upcoming sessions with you have been cancelled.`,
                data: {
                    student_id: studentId,
                    new_mentor_id: newMentorId,
                    old_mentor_id: oldMentorId,
                },
            })
        }

        if (notifications.length > 0) {
            await adminSupabase.from('notifications').insert(notifications)
        }

        // 6. Branded "you've been matched" emails (from Claire). These fire on
        //    every assignment, including later mentor changes. Email failures
        //    must not fail the assignment itself.
        try {
            if (studentProfile?.email) {
                const tpl = studentMatched(studentProfile.full_name || '', newMentorName)
                await sendEmail({
                    from: EMAIL_SENDER_CLAIRE,
                    to: studentProfile.email,
                    subject: tpl.subject,
                    html: tpl.html,
                })
            }
            if (newMentorProfile?.email) {
                const tpl = mentorMatched(newMentorProfile.full_name || '', studentName)
                await sendEmail({
                    from: EMAIL_SENDER_CLAIRE,
                    to: newMentorProfile.email,
                    subject: tpl.subject,
                    html: tpl.html,
                })
            }
        } catch (emailError) {
            console.error('Match email error:', emailError)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Assign mentor error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to assign mentor' },
            { status: 500 }
        )
    }
}
