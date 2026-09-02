import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { newIssueAdmin } from '@/lib/email/templates'

type AdminClient = ReturnType<typeof createAdminClient>

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.accessoxbridge.io').replace(/\/$/, '')

export interface NewIssueNotification {
    /** user_issues.id — surfaced in the in-app notification payload. */
    issueId: string
    issueType: string
    subject: string
    description: string
    /** Defaults to 'normal' (matches the column default). */
    priority?: string
    /** Reporter's display name; falls back to their role. */
    reporterName?: string | null
    reporterType: 'mentor' | 'student'
    /** In-app notification title. Defaults to "New issue reported". */
    title?: string
    /** In-app notification body. Defaults to a short summary of the report. */
    message?: string
    /** Merged into notifications.data (issue_id and kind are always present). */
    data?: Record<string, unknown>
    /** Short slug identifying the source, e.g. 'student_help'. */
    kind?: string
}

/**
 * Tell every admin that a new issue landed in /dashboard/admin/issues.
 *
 * Sends a BRANDED email per admin (direct via Resend) plus an in-app
 * notification. The notification's recipient_email is deliberately EMPTY so the
 * generic notifications trigger doesn't also send an unbranded duplicate —
 * same convention as the invoice-submitted notification.
 *
 * Best-effort: never throws, so a mail failure can't fail the user's report.
 */
export async function notifyAdminsOfNewIssue(
    db: AdminClient,
    issue: NewIssueNotification
): Promise<void> {
    try {
        const { data: admins, error } = await db
            .from('profiles')
            .select('id, email')
            .in('role', ['admin', 'admin-dev'])

        if (error) {
            console.error('[issue-notify] failed to load admins:', error)
            return
        }
        if (!admins || admins.length === 0) return

        const reporterLabel = `${issue.reporterName || (issue.reporterType === 'mentor' ? 'A mentor' : 'A student')} (${issue.reporterType})`
        const priority = issue.priority || 'normal'

        // student_help issues are triaged on their own page.
        const issuesUrl =
            issue.issueType === 'student_help'
                ? `${APP_URL}/dashboard/admin/student-help`
                : `${APP_URL}/dashboard/admin/issues`

        const tmpl = newIssueAdmin({
            reporterLabel,
            issueType: issue.issueType,
            subject: issue.subject,
            description: issue.description,
            priority,
            issuesUrl,
        })

        await Promise.all(
            admins
                .filter((a) => a.email)
                .map(async (a) => {
                    const sent = await sendEmail({
                        from: EMAIL_SENDER_TEAM,
                        to: a.email as string,
                        subject: tmpl.subject,
                        html: tmpl.html,
                    })
                    if (!sent.ok) {
                        console.error(`[issue-notify] email to ${a.email} failed: ${sent.error}`)
                    }
                })
        )

        const snippet = issue.description.length > 140
            ? `${issue.description.slice(0, 140)}…`
            : issue.description

        const rows = admins.map((a) => ({
            recipient_id: a.id,
            recipient_email: '',
            type: 'system_alert' as const,
            title: issue.title || 'New issue reported',
            message: issue.message || `${reporterLabel} reported "${issue.subject}": ${snippet}`,
            data: {
                ...(issue.data || {}),
                issue_id: issue.issueId,
                action: 'view_issue',
                kind: issue.kind || 'user_issue',
            },
        }))

        const { error: notifyError } = await db.from('notifications').insert(rows)
        if (notifyError) console.error('[issue-notify] notification insert failed:', notifyError)
    } catch (e) {
        console.error('[issue-notify] failed:', e)
    }
}
