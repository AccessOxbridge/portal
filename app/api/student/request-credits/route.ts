import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyAdminsOfNewIssue } from '@/lib/admin-issue-notify'

/**
 * POST /api/student/request-credits
 * Student requests more session hours. Notifies all admins (branded email + in-app).
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
            .select('role, full_name, credits')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json().catch(() => ({}))
        const message = typeof body.message === 'string' ? body.message.trim() : ''
        const reason = body.reason === 'booking' ? 'booking' : 'topup'

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }
        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message is too long (max 2000 characters)' }, { status: 400 })
        }

        const credits = (profile as { credits?: number }).credits ?? 0
        const studentName = profile.full_name || 'A student'
        const subject =
            reason === 'booking'
                ? 'Session credits needed to book'
                : 'Session credits top-up request'

        const description = [
            `Student: ${studentName}`,
            `Current balance: ${credits} hour${credits === 1 ? '' : 's'}`,
            `Request type: ${reason === 'booking' ? 'Tried to book a session' : 'Credits top-up'}`,
            '',
            message,
        ].join('\n')

        const admin = createAdminClient()

        const { data: issue, error: issueError } = await admin
            .from('user_issues')
            .insert({
                reporter_id: user.id,
                reporter_type: 'student',
                issue_type: 'payment',
                subject,
                description,
                status: 'open',
                priority: credits <= 0 ? 'high' : 'normal',
            })
            .select('id')
            .single()

        if (issueError || !issue) {
            console.error('[student/request-credits] user_issues insert failed:', issueError)
            return NextResponse.json({ error: 'Failed to submit your request' }, { status: 500 })
        }

        await notifyAdminsOfNewIssue(admin, {
            issueId: issue.id,
            issueType: 'payment',
            subject,
            description,
            priority: credits <= 0 ? 'high' : 'normal',
            reporterName: studentName,
            reporterType: 'student',
            title: 'Session credits request',
            message: `${studentName} (${credits}h remaining) requested credits: "${message.slice(0, 140)}${message.length > 140 ? '…' : ''}"`,
            kind: 'credits_request',
        })

        return NextResponse.json({ success: true, issue_id: issue.id })
    } catch (e) {
        console.error('[student/request-credits]', e)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
