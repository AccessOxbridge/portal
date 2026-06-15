/**
 * Thin Resend client + shared sender identities for transactional emails
 * sent from Next.js route handlers (new-message, matched, first-session, ...).
 *
 * Notification emails that flow through the `notifications` table are still
 * delivered by the Supabase edge function. This module is for the bespoke,
 * branded one-off emails that need their own templates.
 */
const RESEND_API_URL = 'https://api.resend.com/emails'

// Standard "team" sender for #1/#2/#5. Falls back to Resend's test domain
// until a verified domain is configured via RESEND_FROM_EMAIL.
export const EMAIL_SENDER_TEAM =
    process.env.RESEND_FROM_EMAIL || 'Access Oxbridge <onboarding@resend.dev>'

// Personal "Claire Marlowe" sender for the match emails (#3/#4).
export const EMAIL_SENDER_CLAIRE =
    process.env.RESEND_FROM_EMAIL_CLAIRE || 'Claire Marlowe <onboarding@resend.dev>'

interface SendEmailArgs {
    from: string
    to: string
    subject: string
    html: string
}

export async function sendEmail({
    from,
    to,
    subject,
    html,
}: SendEmailArgs): Promise<{ ok: boolean; error?: string }> {
    const key = process.env.RESEND_API_KEY
    if (!key) {
        console.error('[email] RESEND_API_KEY is not configured')
        return { ok: false, error: 'RESEND_API_KEY not configured' }
    }

    try {
        const res = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({ from, to, subject, html }),
        })

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            const error = (data.message || data.error || res.statusText) as string
            console.error('[email] Resend error:', error)
            return { ok: false, error }
        }

        return { ok: true }
    } catch (e) {
        const error = e instanceof Error ? e.message : 'send failed'
        console.error('[email] send threw:', error)
        return { ok: false, error }
    }
}
