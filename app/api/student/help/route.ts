import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyAdminsOfNewIssue } from '@/lib/admin-issue-notify'

/**
 * POST /api/student/help
 * Student submits a help & support request.
 * - Stores it in user_issues (issue_type: student_help) so it appears on /dashboard/admin/student-help.
 * - Notifies all admins (branded email + in-app notification).
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
        const message = typeof body.message === 'string' ? body.message.trim() : ''
        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }
        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message is too long (max 2000 characters)' }, { status: 400 })
        }

        const admin = createAdminClient()

        const { data: issue, error: issueError } = await admin
            .from('user_issues')
            .insert({
                reporter_id: user.id,
                reporter_type: 'student',
                issue_type: 'student_help',
                subject: 'Help & Support request',
                description: message,
                status: 'open',
                priority: 'normal'
            })
            .select('id')
            .single()

        if (issueError || !issue) {
            console.error('[student/help] user_issues insert failed:', issueError)
            return NextResponse.json({ error: 'Failed to submit your request' }, { status: 500 })
        }

        const studentName = profile.full_name || 'A student'

        await notifyAdminsOfNewIssue(admin, {
            issueId: issue.id,
            issueType: 'student_help',
            subject: 'Help & Support request',
            description: message,
            priority: 'normal',
            reporterName: studentName,
            reporterType: 'student',
            title: 'New help & support request',
            message: `${studentName} submitted a help request: "${message.slice(0, 140)}${message.length > 140 ? '…' : ''}"`,
            kind: 'student_help',
        })

        return NextResponse.json({ success: true, issue_id: issue.id })
    } catch (e) {
        console.error('[student/help]', e)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
