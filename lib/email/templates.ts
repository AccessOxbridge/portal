/**
 * Branded HTML email templates for Access Oxbridge transactional emails.
 *
 * Each template returns { subject, html }. The copy is owned by the AO team;
 * keep wording in sync with what's been approved.
 */

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.accessoxbridge.io').replace(/\/$/, '')

const STUDENT_MESSAGES_URL = `${APP_URL}/dashboard/student/messages`
const MENTOR_MESSAGES_URL = `${APP_URL}/dashboard/mentor/messages`
const LOGIN_URL = `${APP_URL}/login`

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

interface DetailRow {
    label: string
    value: string
    /** If set, the value is rendered as a clickable link to this URL. */
    href?: string
}

interface LayoutArgs {
    /** Paragraphs of the email body (already-escaped plain strings). */
    paragraphs: string[]
    cta: { label: string; url: string }
    /** Sign-off lines, e.g. ['Best,', 'The Access Oxbridge Team']. */
    signOff: string[]
    /** Optional Date/Time/Zoom-style detail box. */
    details?: DetailRow[]
    /** Insert the detail box after this paragraph index (0-based). Defaults to after all paragraphs. */
    detailsAfter?: number
}

function detailsBox(details: DetailRow[]): string {
    const rows = details
        .map((d) => {
            const value = d.href
                ? `<a href="${d.href}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${escapeHtml(d.value)}</a>`
                : escapeHtml(d.value)
            return `<p style="margin: 0 0 8px 0; font-size: 15px; line-height: 1.5; color: #374151;"><strong style="color: #1a1a1a;">${escapeHtml(d.label)}:</strong> ${value}</p>`
        })
        .join('\n')
    return `<div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px 20px; margin: 0 0 16px 0;">${rows}</div>`
}

function layout({ paragraphs, cta, signOff, details, detailsAfter }: LayoutArgs): string {
    const renderedParagraphs = paragraphs.map(
        (p) =>
            `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">${p}</p>`
    )

    if (details && details.length > 0) {
        const at = detailsAfter ?? renderedParagraphs.length - 1
        const insertIndex = Math.min(Math.max(at + 1, 0), renderedParagraphs.length)
        renderedParagraphs.splice(insertIndex, 0, detailsBox(details))
    }

    const bodyParagraphs = renderedParagraphs.join('\n')

    const signOffHtml = signOff
        .map(
            (line, i) =>
                `<p style="margin: ${i === 0 ? '24px' : '0'} 0 0 0; font-size: 16px; line-height: 1.5; color: #1a1a1a;">${escapeHtml(line)}</p>`
        )
        .join('\n')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px 20px 32px; background-color: #0a2540; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.3px;">Access Oxbridge</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              ${bodyParagraphs}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${cta.url}" style="display: inline-block; padding: 13px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">${escapeHtml(cta.label)}</a>
                  </td>
                </tr>
              </table>
              ${signOffHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center;">
              You're receiving this email because you have an account on the Access Oxbridge portal.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

const TEAM_SIGN_OFF = ['Best,', 'The Access Oxbridge Team']
const CLAIRE_SIGN_OFF = ['Best,', 'Claire Marlowe', 'Access Oxbridge']

export interface EmailTemplate {
    subject: string
    html: string
}

/** #1 — New message from mentor → student. */
export function newMessageToStudent(studentName: string): EmailTemplate {
    const name = escapeHtml(studentName || 'there')
    return {
        subject: 'New Message from your Mentor | Access Oxbridge',
        html: layout({
            paragraphs: [
                `Hi ${name},`,
                `You've received a new message from your mentor on the Access Oxbridge portal. Click below to view it and respond!`,
            ],
            cta: { label: 'View Message', url: STUDENT_MESSAGES_URL },
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/** #2 — New message from student → mentor. */
export function newMessageToMentor(mentorName: string): EmailTemplate {
    const name = escapeHtml(mentorName || 'there')
    return {
        subject: 'New Message from your Student | Access Oxbridge',
        html: layout({
            paragraphs: [
                `Hi ${name},`,
                `You've received a new message from your student on the Access Oxbridge portal. Click below to view it and respond!`,
            ],
            cta: { label: 'View Message', url: MENTOR_MESSAGES_URL },
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/** #3 — Student matched with mentor (from Claire). */
export function studentMatched(studentName: string, mentorName: string): EmailTemplate {
    const sName = escapeHtml(studentName || 'there')
    const mName = escapeHtml(mentorName || 'your mentor')
    return {
        subject: "You've Been Matched with Your Mentor! | Access Oxbridge",
        html: layout({
            paragraphs: [
                `Hi ${sName},`,
                `Exciting news. You have been matched with your Access Oxbridge mentor, ${mName}.`,
                `${mName} is ready and waiting to get started, so we'd encourage you to log in to the portal as soon as possible, introduce yourself, and get your first session booked in.`,
                `I have already sent you both a message on the portal to clarify where your communication should take place and to offer any support you need throughout your journey with us.`,
                `We're really looking forward to seeing what you achieve together. If you have any questions at all, don't hesitate to get in touch.`,
            ],
            cta: { label: 'Log In to the Portal', url: LOGIN_URL },
            signOff: CLAIRE_SIGN_OFF,
        }),
    }
}

/** #4 — Mentor matched with new student (from Claire). */
export function mentorMatched(mentorName: string, studentName: string): EmailTemplate {
    const mName = escapeHtml(mentorName || 'there')
    const sName = escapeHtml(studentName || 'your new student')
    return {
        subject: "You've Been Matched with Your New Student! | Access Oxbridge",
        html: layout({
            paragraphs: [
                `Hi ${mName},`,
                `You have been matched with your new student, ${sName}.`,
                `Please log in to the portal at your earliest convenience to introduce yourself and coordinate a time for your first session.`,
                `I have already sent you both a message on the portal to clarify where your communication should take place and to offer any support along the way.`,
                `Thank you for being part of the Access Oxbridge team. As always, if you have any questions, we're here.`,
            ],
            cta: { label: 'Log In to the Portal', url: LOGIN_URL },
            signOff: CLAIRE_SIGN_OFF,
        }),
    }
}

/** #5 — Day-after follow-up after a student's first session with a mentor. */
export function firstSessionFollowup(studentName: string, mentorName: string): EmailTemplate {
    const sName = escapeHtml(studentName || 'there')
    const mName = escapeHtml(mentorName || 'your mentor')
    return {
        subject: 'How did your first session go?',
        html: layout({
            paragraphs: [
                `Hi ${sName},`,
                `We hope your first session with ${mName} went well yesterday!`,
                `First sessions are a great chance to get to know each other and start mapping out your journey, so we hope you came away feeling positive and motivated.`,
                `If you haven't already, now is a great time to log in to the portal and get your next session booked in while the momentum is there.`,
                `If anything came up that you'd like to flag, or you have any questions about how things work from here, Claire is on hand and happy to help. Just reach out on the portal.`,
                `We're rooting for you.`,
            ],
            cta: { label: 'Log In to the Portal', url: LOGIN_URL },
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

interface SessionDetails {
    date: string
    time: string
    zoomLink: string | null
}

function sessionDetailRows({ date, time, zoomLink }: SessionDetails): DetailRow[] {
    return [
        { label: 'Date', value: date },
        { label: 'Time', value: time },
        zoomLink
            ? { label: 'Zoom link', value: 'Join Zoom Meeting', href: zoomLink }
            : { label: 'Zoom link', value: 'Will be shared on the portal before your session' },
    ]
}

/** Session booked → student. */
export function sessionConfirmedStudent(
    studentName: string,
    mentorName: string,
    details: SessionDetails
): EmailTemplate {
    const sName = escapeHtml(studentName || 'there')
    const mName = escapeHtml(mentorName || 'your mentor')
    return {
        subject: 'Session Confirmed! | Access Oxbridge',
        html: layout({
            paragraphs: [
                `Hi ${sName},`,
                `Great news! Your next session with ${mName} is confirmed.`,
                `We'd recommend having any materials, questions, or topics you want to cover ready ahead of time so you get the most out of it.`,
                `Log in to the portal anytime to message ${mName} or manage your upcoming sessions.`,
            ],
            details: sessionDetailRows(details),
            detailsAfter: 1,
            cta: { label: 'Log In to the Portal', url: LOGIN_URL },
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/** Session booked → mentor. */
export function sessionConfirmedMentor(
    mentorName: string,
    studentName: string,
    details: SessionDetails
): EmailTemplate {
    const mName = escapeHtml(mentorName || 'there')
    const sName = escapeHtml(studentName || 'your student')
    return {
        subject: 'Session Confirmation | Access Oxbridge',
        html: layout({
            paragraphs: [
                `Hi ${mName},`,
                `This is a confirmation that your upcoming session with ${sName} is booked in.`,
                `If anything changes or you need to get in touch with your student ahead of the session, you can do so via the portal.`,
            ],
            details: sessionDetailRows(details),
            detailsAfter: 1,
            cta: { label: 'Log In to the Portal', url: LOGIN_URL },
            signOff: ['Thank you,', 'The Access Oxbridge Team'],
        }),
    }
}

/** Inactivity nudge → student (no session for a while). */
export function sessionInactivityStudent(studentName: string, mentorName: string): EmailTemplate {
    const sName = escapeHtml(studentName || 'there')
    const mName = escapeHtml(mentorName || 'your mentor')
    return {
        subject: 'Time to book your next session!',
        html: layout({
            paragraphs: [
                `Hi ${sName},`,
                `We noticed it's been a little while since your last session with ${mName}. With your Oxbridge application in mind, keeping up a consistent pace really does make a difference.`,
                `Log in to the portal to get your next session booked in and keep the momentum going.`,
                `If anything has come up or you'd like to chat to the team, just reach out to Claire on the portal and she will be more than happy to help.`,
            ],
            cta: { label: 'Log In to the Portal', url: LOGIN_URL },
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/** Inactivity nudge → mentor (no session for a while). */
export function sessionInactivityMentor(mentorName: string, studentName: string): EmailTemplate {
    const mName = escapeHtml(mentorName || 'there')
    const sNameRaw = studentName || 'your student'
    const sName = escapeHtml(sNameRaw)
    return {
        subject: `Checking in on your sessions with ${sNameRaw}`,
        html: layout({
            paragraphs: [
                `Hi ${mName},`,
                `We wanted to check in as it looks like some time has passed since your last session with ${sName}.`,
                `When you get a chance, please log in to the portal and reach out to coordinate your next one. Keeping sessions regular is really important at this stage of the application cycle.`,
                `As always, if there's anything you'd like to flag or discuss with the team, just reach out on the portal.`,
            ],
            cta: { label: 'Log In to the Portal', url: LOGIN_URL },
            signOff: ['Thank you,', 'The Access Oxbridge Team'],
        }),
    }
}
