export async function sendMentorApprovalEmail(email: string, fullName: string) {
    console.log(`[EMAIL MOCK] Sending approval email to ${fullName} (${email})...`)
    // TODO: Integrate with Resend, SendGrid, etc.
    // Example:
    // const res = await fetch('https://api.resend.com/emails', { ... })

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
