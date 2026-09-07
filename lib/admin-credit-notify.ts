import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { creditAdjustmentAdmin } from '@/lib/email/templates'

type AdminClient = ReturnType<typeof createAdminClient>

export interface CreditAdjustmentNotification {
    adminId: string
    adminName: string | null
    studentId: string
    studentName: string | null
    /** Effective delta after the floor at zero. Signed, never 0. */
    delta: number
    balanceBefore: number
    balanceAfter: number
    reason: string
    /** credit_transactions.id — surfaced in the in-app notification payload. */
    transactionId: string
}

/**
 * Tell every admin that a student's credit balance was adjusted.
 *
 * Sends a BRANDED email per admin (direct via Resend) plus an in-app
 * notification. recipient_email is deliberately EMPTY so the generic
 * notifications trigger doesn't also send an unbranded duplicate — same
 * convention as notifyAdminsOfNewIssue in lib/admin-issue-notify.ts.
 *
 * Best-effort: never throws. The adjustment has already committed by the time
 * this runs, so a mail failure must not turn a successful grant into an error
 * the admin might retry — a retry would double the credits.
 */
export async function notifyAdminsOfCreditAdjustment(
    db: AdminClient,
    adjustment: CreditAdjustmentNotification
): Promise<void> {
    try {
        const { data: admins, error } = await db
            .from('profiles')
            .select('id, email')
            .in('role', ['admin', 'admin-dev'])

        if (error) {
            console.error('[credit-notify] failed to load admins:', error)
            return
        }
        if (!admins || admins.length === 0) return

        const adminLabel = adjustment.adminName || 'An admin'
        const studentLabel = adjustment.studentName || 'a student'

        const tmpl = creditAdjustmentAdmin({
            adminLabel,
            studentLabel,
            delta: adjustment.delta,
            balanceBefore: adjustment.balanceBefore,
            balanceAfter: adjustment.balanceAfter,
            reason: adjustment.reason,
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
                        console.error(`[credit-notify] email to ${a.email} failed: ${sent.error}`)
                    }
                })
        )

        const sign = adjustment.delta > 0 ? '+' : ''
        const rows = admins.map((a) => ({
            recipient_id: a.id,
            recipient_email: '',
            type: 'system_alert' as const,
            title: 'Student credits adjusted',
            message: `${adminLabel} adjusted ${studentLabel}'s hours by ${sign}${adjustment.delta} (${adjustment.balanceBefore} → ${adjustment.balanceAfter}): ${adjustment.reason}`,
            data: {
                kind: 'credit_adjustment',
                action: 'view_students',
                transaction_id: adjustment.transactionId,
                student_id: adjustment.studentId,
                admin_id: adjustment.adminId,
                delta: adjustment.delta,
                balance_before: adjustment.balanceBefore,
                balance_after: adjustment.balanceAfter,
            },
        }))

        const { error: notifyError } = await db.from('notifications').insert(rows)
        if (notifyError) console.error('[credit-notify] notification insert failed:', notifyError)
    } catch (e) {
        console.error('[credit-notify] failed:', e)
    }
}
