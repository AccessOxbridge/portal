/**
 * One-off: render every canonical Access Oxbridge email template with sample
 * data and send them to a single inbox so the design can be eyeballed.
 *
 *   bun run scripts/send-test-emails.ts [recipient@example.com]
 *
 * Reads RESEND_API_KEY / RESEND_FROM_EMAIL from .env.local (Bun auto-loads it).
 * All previews are sent from the verified team sender so they actually deliver
 * to external inboxes (the Claire fallback uses Resend's test domain, which
 * only delivers to the account owner).
 */
import { EMAIL_SENDER_TEAM, sendEmail } from '../lib/email/client'
import {
    type EmailTemplate,
    firstSessionFollowup,
    mentorMatched,
    newMessageToMentor,
    newMessageToStudent,
    sessionConfirmedMentor,
    sessionConfirmedStudent,
    sessionInactivityMentor,
    sessionInactivityStudent,
    studentMatched,
} from '../lib/email/templates'

const RECIPIENT = process.argv[2] || 'rajvishwakarma303@gmail.com'

const STUDENT = 'Alex'
const MENTOR = 'Dr. Sarah Bennett'
const SESSION = {
    date: 'Monday, 23 June 2026',
    time: '4:00 pm – 5:00 pm (BST)',
    zoomLink: 'https://zoom.us/j/1234567890',
}

const previews: { key: string; template: EmailTemplate }[] = [
    { key: 'newMessageToStudent', template: newMessageToStudent(STUDENT) },
    { key: 'newMessageToMentor', template: newMessageToMentor(MENTOR) },
    { key: 'studentMatched', template: studentMatched(STUDENT, MENTOR) },
    { key: 'mentorMatched', template: mentorMatched(MENTOR, STUDENT) },
    { key: 'firstSessionFollowup', template: firstSessionFollowup(STUDENT, MENTOR) },
    { key: 'sessionConfirmedStudent', template: sessionConfirmedStudent(STUDENT, MENTOR, SESSION) },
    { key: 'sessionConfirmedMentor', template: sessionConfirmedMentor(MENTOR, STUDENT, SESSION) },
    { key: 'sessionInactivityStudent', template: sessionInactivityStudent(STUDENT, MENTOR) },
    { key: 'sessionInactivityMentor', template: sessionInactivityMentor(MENTOR, STUDENT) },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set — aborting. Run with .env.local present.')
        process.exit(1)
    }

    console.log(`Sending ${previews.length} email previews to ${RECIPIENT} from "${EMAIL_SENDER_TEAM}"\n`)

    let sent = 0
    for (const { key, template } of previews) {
        const result = await sendEmail({
            from: EMAIL_SENDER_TEAM,
            to: RECIPIENT,
            subject: template.subject,
            html: template.html,
        })
        if (result.ok) {
            sent++
            console.log(`  ✓ ${key} — "${template.subject}"`)
        } else {
            console.error(`  ✗ ${key} — ${result.error}`)
        }
        // Stay under Resend's rate limit.
        await sleep(600)
    }

    console.log(`\nDone. ${sent}/${previews.length} sent to ${RECIPIENT}.`)
    if (sent !== previews.length) process.exit(1)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
