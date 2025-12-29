import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SessionConfirmationParams {
    recipientEmail: string
    recipientName: string
    otherPartyName: string
    otherPartyRole: 'student' | 'mentor'
    scheduledAt: Date
    zoomJoinUrl: string
}

export async function sendSessionConfirmationEmail(params: SessionConfirmationParams) {
    const { recipientEmail, recipientName, otherPartyName, otherPartyRole, scheduledAt, zoomJoinUrl } = params

    const formattedDate = scheduledAt.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
    const formattedTime = scheduledAt.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    })

    const subject = '🎉 Your Mentorship Session is Confirmed!'
    const html = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #4338ca; margin-bottom: 24px;">Session Confirmed!</h1>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Hi ${recipientName},
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Great news! Your mentorship session with <strong>${otherPartyName}</strong> has been confirmed.
            </p>
            <div style="background: #f3f4f6; border-radius: 16px; padding: 24px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">📅 Date</p>
                <p style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">${formattedDate}</p>
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">🕐 Time</p>
                <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">${formattedTime}</p>
            </div>
            <a href="${zoomJoinUrl}" style="display: inline-block; background: #4338ca; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Join Zoom Meeting
            </a>
            <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
                Can't click the button? Copy this link: <br/>
                <a href="${zoomJoinUrl}" style="color: #4338ca;">${zoomJoinUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;"/>
            <p style="font-size: 12px; color: #9ca3af;">
                Oxbridge Mentorship Portal
            </p>
        </div>
    `

    if (resend) {
        try {
            await resend.emails.send({
                from: 'Oxbridge <notifications@oxbridge.ai>',
                to: recipientEmail,
                subject,
                html,
            })
            console.log(`[EMAIL] Sent session confirmation to ${recipientEmail}`)
            return { success: true }
        } catch (error) {
            console.error('[EMAIL] Failed to send:', error)
            return { success: false, error }
        }
    } else {
        console.log(`[EMAIL MOCK] Session confirmation to ${recipientName} (${recipientEmail})`)
        console.log(`  Date: ${formattedDate} at ${formattedTime}`)
        console.log(`  Zoom: ${zoomJoinUrl}`)
        return { success: true }
    }
}

export async function sendMentorApprovalEmail(email: string, fullName: string) {
    if (resend) {
        try {
            await resend.emails.send({
                from: 'Oxbridge <notifications@oxbridge.ai>',
                to: email,
                subject: '🎓 Welcome to Oxbridge - Your Mentor Application is Approved!',
                html: `
                    <div style="font-family: system-ui, sans-serif; max-width: 600px; padding: 40px 20px;">
                        <h1 style="color: #4338ca;">Congratulations, ${fullName}!</h1>
                        <p>Your mentor application has been approved. You can now start receiving mentorship requests from students.</p>
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/mentor" 
                           style="display: inline-block; background: #4338ca; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
                            Go to Dashboard
                        </a>
                    </div>
                `,
            })
            return { success: true }
        } catch (error) {
            console.error('[EMAIL] Failed:', error)
            return { success: false, error }
        }
    }
    console.log(`[EMAIL MOCK] Sending approval email to ${fullName} (${email})...`)
    return { success: true }
}

export async function sendMentorApplicationReceivedEmail(email: string, fullName: string) {
    console.log(`[EMAIL MOCK] Sending application received email to ${fullName} (${email})...`)
    return { success: true }
}

export async function sendMentorshipMatchEmail(email: string, studentName: string, mentorName: string) {
    console.log(`[EMAIL MOCK] Sending match notification to ${studentName}. Mentor ${mentorName} has accepted!`)
    return { success: true }
}

