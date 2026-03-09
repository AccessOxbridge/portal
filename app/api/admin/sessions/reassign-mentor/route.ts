import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

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
        const sessionId = body?.session_id as string | undefined
        const newMentorId = body?.new_mentor_id as string | undefined

        if (!sessionId || !newMentorId) {
            return NextResponse.json(
                { error: 'session_id and new_mentor_id are required' },
                { status: 400 }
            )
        }

        const { data: session, error: sessionError } = await adminSupabase
            .from('sessions')
            .select('id, mentor_id, student_id, scheduled_at, status')
            .eq('id', sessionId)
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        const oldMentorId = session.mentor_id

        if (!oldMentorId) {
            return NextResponse.json({ error: 'Session has no assigned mentor' }, { status: 400 })
        }

        if (oldMentorId === newMentorId) {
            return NextResponse.json({ error: 'New mentor is the same as current mentor' }, { status: 400 })
        }

        const { data: profiles, error: profilesError } = await adminSupabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', [session.student_id, oldMentorId, newMentorId])

        if (profilesError) {
            return NextResponse.json(
                { error: 'Failed to load profiles for notification' },
                { status: 500 }
            )
        }

        const profileMap = new Map(
            (profiles || []).map((p: any) => [p.id, p])
        )

        const studentProfile = profileMap.get(session.student_id)
        const oldMentorProfile = profileMap.get(oldMentorId)
        const newMentorProfile = profileMap.get(newMentorId)

        const scheduledAtDate = session.scheduled_at ? new Date(session.scheduled_at) : null
        const formattedDate = scheduledAtDate
            ? scheduledAtDate.toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
              })
            : null
        const formattedTime = scheduledAtDate
            ? scheduledAtDate.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
              })
            : null

        const timeDisplay = formattedDate && formattedTime
            ? `${formattedDate} at ${formattedTime}`
            : 'an upcoming time'

        const studentName = studentProfile?.full_name || 'the student'
        const oldMentorName = oldMentorProfile?.full_name || 'the current mentor'
        const newMentorName = newMentorProfile?.full_name || 'a new mentor'

        const { error: updateError } = await adminSupabase
            .from('sessions')
            .update({
                mentor_id: newMentorId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', session.id)

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to update session mentor' },
                { status: 500 }
            )
        }

        const notificationsToInsert: any[] = []

        if (oldMentorProfile?.email) {
            notificationsToInsert.push({
                recipient_id: oldMentorId,
                recipient_email: oldMentorProfile.email,
                type: 'system_alert' as const,
                title: 'Session reassigned to another mentor',
                message: `Your session with ${studentName} scheduled for ${timeDisplay} has been reassigned to another mentor. You no longer need to attend this session.`,
                data: {
                    session_id: session.id,
                    student_id: session.student_id,
                    old_mentor_id: oldMentorId,
                    new_mentor_id: newMentorId,
                    scheduled_at: session.scheduled_at,
                },
            })
        }

        if (newMentorProfile?.email) {
            notificationsToInsert.push({
                recipient_id: newMentorId,
                recipient_email: newMentorProfile.email,
                type: 'system_alert' as const,
                title: 'New session assigned to you',
                message: `You have been assigned a new session with ${studentName} scheduled for ${timeDisplay}. Please review your sessions dashboard for full details.`,
                data: {
                    session_id: session.id,
                    student_id: session.student_id,
                    old_mentor_id: oldMentorId,
                    new_mentor_id: newMentorId,
                    scheduled_at: session.scheduled_at,
                },
            })
        }

        if (notificationsToInsert.length > 0) {
            await adminSupabase
                .from('notifications')
                .insert(notificationsToInsert)
        }

        return NextResponse.json({
            success: true,
        })
    } catch (error: any) {
        console.error('Reassign mentor error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to reassign mentor' },
            { status: 500 }
        )
    }
}

