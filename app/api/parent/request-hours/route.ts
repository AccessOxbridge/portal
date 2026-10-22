import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyAdminsOfNewIssue } from '@/lib/admin-issue-notify'

/** One open request per parent a day is plenty; repeats are acknowledged, not filed. */
const REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * POST /api/parent/request-hours
 * A linked parent asks the team for more hours for their child: the only
 * thing a parent account can send. Files a user_issues row (reporter_type
 * 'parent') and notifies admins, like the student request-credits route.
 *
 * Who is asking and for which child is checked with the parent's own client
 * (RLS shows them only their own link and their child); only then does the
 * service role write the issue.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: me } = await supabase.from('profiles_private').select('role, full_name, email').eq('id', user.id).single()
        if (me?.role !== 'parent') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data: link } = await supabase
            .from('parent_student_links')
            .select('student_id')
            .eq('parent_id', user.id)
            .is('revoked_at', null)
            .maybeSingle()
        if (!link) {
            return NextResponse.json({ error: 'Your account is not linked to a student yet' }, { status: 409 })
        }

        const body = await req.json().catch(() => ({}))
        const note = typeof body.message === 'string' ? body.message.trim() : ''
        if (note.length > 1000) {
            return NextResponse.json({ error: 'Message is too long (max 1000 characters)' }, { status: 400 })
        }

        const { data: child } = await supabase.from('profiles_private').select('full_name, credits').eq('id', link.student_id).single()
        const childName = child?.full_name || 'their child'
        const credits = child?.credits ?? 0
        const parentName = me.full_name || 'A parent'

        const admin = createAdminClient()

        const { data: recent } = await admin
            .from('user_issues')
            .select('id')
            .eq('reporter_id', user.id)
            .eq('issue_type', 'payment')
            .eq('status', 'open')
            .gte('created_at', new Date(Date.now() - REPEAT_WINDOW_MS).toISOString())
            .limit(1)
        if (recent?.length) {
            return NextResponse.json({ success: true, issue_id: recent[0].id, repeat: true })
        }

        const subject = `More hours requested by ${childName}'s parent`
        const description = [
            `Parent: ${parentName}${me.email ? ` (${me.email})` : ''}`,
            `Student: ${childName}`,
            `Current balance: ${credits} hour${credits === 1 ? '' : 's'}`,
            '',
            note || '(No message)',
        ].join('\n')
        const priority = credits <= 0 ? 'high' : 'normal'

        const { data: issue, error: issueError } = await admin
            .from('user_issues')
            .insert({
                reporter_id: user.id,
                reporter_type: 'parent',
                issue_type: 'payment',
                subject,
                description,
                status: 'open',
                priority,
            })
            .select('id')
            .single()

        if (issueError || !issue) {
            console.error('[parent/request-hours] user_issues insert failed:', issueError)
            return NextResponse.json({ error: 'Failed to send your request' }, { status: 500 })
        }

        await notifyAdminsOfNewIssue(admin, {
            issueId: issue.id,
            issueType: 'payment',
            subject,
            description,
            priority,
            reporterName: parentName,
            reporterType: 'parent',
            title: 'More hours requested by a parent',
            message: `${parentName} asked for more hours for ${childName} (${credits}h remaining)${note ? `: "${note.slice(0, 140)}${note.length > 140 ? '…' : ''}"` : '.'}`,
            kind: 'credits_request',
        })

        return NextResponse.json({ success: true, issue_id: issue.id })
    } catch (e) {
        console.error('[parent/request-hours]', e)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
