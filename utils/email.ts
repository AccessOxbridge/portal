import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import {
    mentorApplicationReceived,
    mentorApplicationApproved,
    mentorApplicationReviewAdmin,
} from '@/lib/email/templates'

export async function sendMentorApprovalEmail(email: string, fullName: string) {
    if (!email) return { success: false }
    const tmpl = mentorApplicationApproved(fullName)
    const sent = await sendEmail({
        from: EMAIL_SENDER_TEAM,
        to: email,
        subject: tmpl.subject,
        html: tmpl.html,
    })
    if (!sent.ok) {
        console.error('[email] mentor approval failed:', sent.error)
        return { success: false }
    }
    return { success: true }
}

export async function sendMentorApplicationReceivedEmail(email: string, fullName: string) {
    if (!email) return { success: false }
    const tmpl = mentorApplicationReceived(fullName)
    const sent = await sendEmail({
        from: EMAIL_SENDER_TEAM,
        to: email,
        subject: tmpl.subject,
        html: tmpl.html,
    })
    if (!sent.ok) {
        console.error('[email] mentor application received failed:', sent.error)
        return { success: false }
    }
    return { success: true }
}

export async function notifyAdminsOfMentorApplication(mentorName: string) {
    try {
        const admin = createAdminClient()
        const { data: admins, error } = await admin
            .from('profiles')
            .select('email')
            .in('role', ['admin', 'admin-dev'])

        if (error) {
            console.error('[email] list admins for mentor application failed:', error.message)
            return { success: false }
        }

        const tmpl = mentorApplicationReviewAdmin(mentorName)
        const recipients = (admins || []).map((a) => a.email).filter((e): e is string => !!e)

        await Promise.all(
            recipients.map(async (to) => {
                const sent = await sendEmail({
                    from: EMAIL_SENDER_TEAM,
                    to,
                    subject: tmpl.subject,
                    html: tmpl.html,
                })
                if (!sent.ok) {
                    console.error(`[email] mentor application admin notify to ${to} failed:`, sent.error)
                }
            })
        )
        return { success: true }
    } catch (e) {
        console.error('[email] notifyAdminsOfMentorApplication threw:', e)
        return { success: false }
    }
}

export async function sendMentorshipMatchEmail(email: string, studentName: string, mentorName: string) {
    console.log(`[EMAIL MOCK] Sending match notification to ${studentName}. Mentor ${mentorName} has accepted!`)
    return { success: true }
}
