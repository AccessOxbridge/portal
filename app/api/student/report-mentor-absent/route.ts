import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyAdminsOfNewIssue } from '@/lib/admin-issue-notify'

/**
 * POST /api/student/report-mentor-absent
 * Student reports that the mentor is absent (has not joined the session).
 * - Stores the report in user_issues (issue_type: session, subject: Mentor absent).
 * - Notifies all admins (branded email + in-app notification).
 * - Notifies the mentor with an urgent message: "{Student name} is waiting in the meeting!"
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

        if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
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
            .eq('student_id', user.id)
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
            .eq('subject', 'Mentor absent - student reported')
            .limit(1)
            .maybeSingle()

        if (existingIssue) {
            return NextResponse.json({ error: 'You have already reported this session' }, { status: 409 })
        }

        const { data: issue, error: issueError } = await admin
            .from('user_issues')
            .insert({
                reporter_id: user.id,
                reporter_type: 'student',
                issue_type: 'session',
                subject: 'Mentor absent - student reported',
                description: `Student reported that the mentor did not join the session. Session ID: ${sessionId}.`,
                session_id: sessionId,
                status: 'open',
                priority: 'high'
            })
            .select('id')
            .single()

        if (issueError || !issue) {
            console.error('[report-mentor-absent] user_issues insert failed:', issueError)
            return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
        }

        const studentName = profile.full_name || 'A student'

        await notifyAdminsOfNewIssue(admin, {
            issueId: issue.id,
            issueType: 'session',
            subject: 'Mentor absent - student reported',
            description: `Student reported that the mentor did not join the session. Session ID: ${sessionId}.`,
            priority: 'high',
            reporterName: studentName,
            reporterType: 'student',
            title: 'Student reported: Mentor absent',
            message: `${studentName} has reported that their mentor did not join the session. Please check the session and follow up.`,
            data: { session_id: sessionId },
            kind: 'mentor_absent_report',
        })

        await admin.from('notifications').insert({
            recipient_id: session.mentor_id,
            recipient_email: '',
            type: 'system_alert' as const,
            title: 'Urgent: Student waiting in the meeting',
            message: `${studentName} is waiting in the meeting!`,
            data: { session_id: sessionId, action: 'join_session', kind: 'student_waiting' }
        })

        return NextResponse.json({ success: true, issue_id: issue.id })
    } catch (e) {
        console.error('[report-mentor-absent]', e)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
