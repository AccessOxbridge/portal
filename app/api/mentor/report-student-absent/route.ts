import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * POST /api/mentor/report-student-absent
 * Mentor reports that the student is absent (has not joined the session).
 * - Stores the report in user_issues (issue_type: session, subject: Student absent).
 * - Notifies all admins (in-app notification).
 * - Notifies the student (in-app notification).
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json().catch(() => ({}))
        const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : null
        if (!sessionId) {
            return NextResponse.json({ error: 'session_id required' }, { status: 400 })
        }

        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('id, student_id, mentor_id, scheduled_at, duration_minutes, status, zoom_meeting_status')
            .eq('id', sessionId)
            .eq('mentor_id', user.id)
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session not found or not yours' }, { status: 404 })
        }

        const now = new Date()
        const start = session.scheduled_at ? new Date(session.scheduled_at).getTime() : 0
        const durationMinutes = session.duration_minutes ?? 60
        const end = start + durationMinutes * 60 * 1000
        const isCurrent =
            session.status === 'active' &&
            (session.zoom_meeting_status === 'started' || (now.getTime() >= start && now.getTime() < end))

        if (!isCurrent) {
            return NextResponse.json({ error: 'Session is not currently active' }, { status: 400 })
        }

        const admin = createAdminClient()

        const { data: existingIssue } = await admin
            .from('user_issues')
            .select('id')
            .eq('session_id', sessionId)
            .eq('reporter_id', user.id)
            .eq('issue_type', 'session')
            .eq('subject', 'Student absent - mentor reported')
            .limit(1)
            .maybeSingle()

        if (existingIssue) {
            return NextResponse.json({ error: 'You have already reported this session' }, { status: 409 })
        }

        const { data: issue, error: issueError } = await admin
            .from('user_issues')
            .insert({
                reporter_id: user.id,
                reporter_type: 'mentor',
                issue_type: 'session',
                subject: 'Student absent - mentor reported',
                description: `Mentor reported that the student did not join the session. Session ID: ${sessionId}.`,
                session_id: sessionId,
                status: 'open',
                priority: 'high'
            })
            .select('id')
            .single()

        if (issueError || !issue) {
            console.error('[report-student-absent] user_issues insert failed:', issueError)
            return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
        }

        const mentorName = profile.full_name || 'Your mentor'

        const { data: adminProfiles } = await admin
            .from('profiles')
            .select('id, email')
            .in('role', ['admin', 'admin-dev'])

        if (adminProfiles && adminProfiles.length > 0) {
            const adminNotifications = adminProfiles.map((p) => ({
                recipient_id: p.id,
                recipient_email: p.email || '',
                type: 'system_alert' as const,
                title: 'Mentor reported: Student absent',
                message: `${mentorName} has reported that their student did not join the session. Please check the session and follow up.`,
                data: { session_id: sessionId, issue_id: issue.id, action: 'view_issue', kind: 'student_absent_report' }
            }))
            await admin.from('notifications').insert(adminNotifications)
        }

        await admin.from('notifications').insert({
            recipient_id: session.student_id,
            recipient_email: '',
            type: 'system_alert' as const,
            title: 'Your mentor reported you were absent',
            message: `${mentorName} reported that you did not join the session. Please join the meeting if you're available.`,
            data: { session_id: sessionId, action: 'join_session', kind: 'mentor_reported_absent' }
        })

        return NextResponse.json({ success: true, issue_id: issue.id })
    } catch (e) {
        console.error('[report-student-absent]', e)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
