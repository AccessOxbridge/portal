/**
 * Branded HTML email templates for Access Oxbridge transactional emails.
 *
 * Every template renders through the single canonical Access Oxbridge email
 * design (`layout`). The ONLY thing that varies between emails is the body
 * region: the preheader, the greeting, the body paragraphs, an optional
 * numbered list, and the sign-off. The <head>, <style>, dark header (logo +
 * wordmark) and the full footer are identical for every email — never edit
 * them here. To add a new email, add a function that calls `layout(...)`.
 */

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.accessoxbridge.io').replace(/\/$/, '')

const STUDENT_MESSAGES_URL = `${APP_URL}/dashboard/student/messages`
const MENTOR_MESSAGES_URL = `${APP_URL}/dashboard/mentor/messages`
const LOGIN_URL = `${APP_URL}/login`

const LOGO_URL = 'https://accessoxbridge.io/email-logo.png'

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

/** An inline brand link, styled to match the footer links (gold underline). */
function link(label: string, url: string): string {
    return `<a class="email-link" href="${url}" style="color:#0C1B2A;text-decoration:underline;text-decoration-color:#D4BC8B;">${escapeHtml(label)}</a>`
}

interface ListItem {
    /** Optional bold lead-in, e.g. "The Preliminary Call". */
    title?: string
    /** Item copy (already-escaped / safe HTML). */
    body: string
}

interface LayoutArgs {
    /** <title> in the head and a sensible default subject. */
    title: string
    /** Hidden one-sentence summary shown in inbox previews. */
    preheader: string
    /** Body paragraphs as safe HTML (greeting first). */
    paragraphs: string[]
    /** Optional "What to expect next" style numbered list. */
    list?: { heading: string; items: ListItem[] }
    /** Sign-off lines; index 1 (the name) is rendered bold. */
    signOff: string[]
}

function renderList(list: { heading: string; items: ListItem[] }): string {
    const rows = list.items
        .map((item, i) => {
            const isLast = i === list.items.length - 1
            const numberPad = isLast ? '0 12px 0 0' : '0 12px 16px 0'
            const cellPad = isLast ? '' : '0 0 16px'
            const lead = item.title ? `<strong>${escapeHtml(item.title)}:</strong> ` : ''
            return `                                    <tr>
                                        <td class="email-number" valign="top" width="24" style="padding:${numberPad};font-size:15px;line-height:1.65;font-weight:800;color:#D4BC8B;">
                                            ${i + 1}.
                                        </td>
                                        <td${cellPad ? ` style="padding:${cellPad};"` : ''}>
                                            <p class="email-text" style="margin:0;font-size:15px;line-height:1.65;color:#0C1B2A;">
                                                ${lead}${item.body}
                                            </p>
                                        </td>
                                    </tr>`
        })
        .join('\n')

    return `                                <h2 class="email-heading" style="margin:12px 0 18px;font-size:20px;line-height:1.3;font-weight:800;color:#0C1B2A;">
                                    ${escapeHtml(list.heading)}
                                </h2>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 30px;">
${rows}
                                </table>`
}

function layout({ title, preheader, paragraphs, list, signOff }: LayoutArgs): string {
    const bodyParagraphs = paragraphs
        .map(
            (p) =>
                `                                <p class="email-text" style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#0C1B2A;">
                                    ${p}
                                </p>`
        )
        .join('\n')

    const listBlock = list ? `\n${renderList(list)}\n` : ''

    const signOffHtml = signOff
        .map((line, i) => (i === 1 ? `<strong>${escapeHtml(line)}</strong>` : escapeHtml(line)))
        .join('<br />\n                                    ')

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />
        <title>${escapeHtml(title)}</title>
        <style>
            :root {
                color-scheme: light;
                supported-color-schemes: light;
            }
            .email-bg {
                background-color: #F7F2EA;
            }
            .email-shell,
            .email-content {
                background-color: #FAF7F3;
            }
            .email-header {
                background-color: #0C1B2A;
            }
            .email-footer {
                background-color: #F7F2EA;
            }
            .email-text,
            .email-text strong,
            .email-heading,
            .email-link {
                color: #0C1B2A;
            }
            .email-brand,
            .email-number,
            .email-separator {
                color: #D4BC8B;
            }
            .email-muted {
                color: #5C6670;
            }
            .email-logo {
                opacity: 1;
            }
        </style>
    </head>
    <body class="email-bg" bgcolor="#F7F2EA" style="margin:0;padding:0;background-color:#F7F2EA;font-family:Inter,Arial,sans-serif;color:#0C1B2A;">
        <!-- ===== PREHEADER (editable) ===== -->
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            ${preheader}
        </div>
        <table class="email-bg" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F7F2EA" style="background-color:#F7F2EA;margin:0;padding:0;">
            <tr>
                <td align="center" style="padding:0 0 32px;">
                    <table class="email-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FAF7F3" style="width:100%;background-color:#FAF7F3;">
                        <!-- ===== HEADER (do not edit) ===== -->
                        <tr>
                            <td class="email-header" bgcolor="#0C1B2A" style="background-color:#0C1B2A;padding:42px 44px 44px;text-align:center;">
                                <img class="email-logo" src="${LOGO_URL}" alt="Access Oxbridge" width="84" height="84" style="display:block;width:84px;height:84px;margin:0 auto 14px;border:0;border-radius:50%;filter:none;opacity:1;" />
                                <p class="email-brand" style="margin:0;font-size:22px;line-height:1.2;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#D4BC8B;font-family:'Playfair Display', Georgia, 'Times New Roman', serif;">
                                    Access Oxbridge
                                </p>
                            </td>
                        </tr>
                        <!-- ===== BODY (editable region) ===== -->
                        <tr>
                            <td class="email-content" bgcolor="#FAF7F3" style="padding:46px 44px 20px;background-color:#FAF7F3;">
${bodyParagraphs}
${listBlock}                                <p class="email-text" style="margin:0;font-size:16px;line-height:1.7;color:#0C1B2A;">
                                    ${signOffHtml}
                                </p>
                            </td>
                        </tr>
                        <!-- ===== END BODY ===== -->
                        <!-- ===== FOOTER (do not edit) ===== -->
                        <tr>
                            <td class="email-footer" bgcolor="#F7F2EA" style="padding:34px 44px 40px;text-align:center;background-color:#F7F2EA;border-top:1px solid rgba(12,27,42,0.08);">
                                <p class="email-muted" style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#5C6670;">
                                    Expert-led Oxbridge admissions strategy, personal statement support, and interview preparation.
                                </p>
                                <p style="margin:0 0 16px;font-size:0;line-height:1;">
                                    <a href="https://www.instagram.com/accessoxbridge" aria-label="Instagram" style="display:inline-block;margin:0 8px;text-decoration:none;">
                                        <img class="social-icon" src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/instagram.svg" alt="Instagram" width="20" height="20" style="display:block;width:20px;height:20px;border:0;filter:none;opacity:1;" />
                                    </a>
                                    <a href="https://www.linkedin.com/company/access-oxbridge/" aria-label="LinkedIn" style="display:inline-block;margin:0 8px;text-decoration:none;">
                                        <img class="social-icon" src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/linkedin.svg" alt="LinkedIn" width="20" height="20" style="display:block;width:20px;height:20px;border:0;filter:none;opacity:1;" />
                                    </a>
                                    <a href="https://www.facebook.com/profile.php?id=61577464626040" aria-label="Facebook" style="display:inline-block;margin:0 8px;text-decoration:none;">
                                        <img class="social-icon" src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/facebook.svg" alt="Facebook" width="20" height="20" style="display:block;width:20px;height:20px;border:0;filter:none;opacity:1;" />
                                    </a>
                                </p>
                                <p class="email-text" style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#0C1B2A;">
                                    This email was sent by <a class="email-link" href="https://accessoxbridge.io/" style="color:#0C1B2A;text-decoration:underline;text-decoration-color:#D4BC8B;">Access Oxbridge</a>
                                </p>
                                <p class="email-text" style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#0C1B2A;">
                                    Copyright © 2026 Access Oxbridge. All rights reserved.
                                </p>
                                <p class="email-text" style="margin:0;font-size:12px;line-height:1.6;color:#0C1B2A;">
                                    <a class="email-link" href="https://www.accessoxbridge.io/privacy" style="color:#0C1B2A;text-decoration:underline;text-decoration-color:#D4BC8B;">Privacy Policy</a>
                                    <span class="email-separator" style="color:#D4BC8B;">&nbsp;|&nbsp;</span>
                                    <a class="email-link" href="https://www.accessoxbridge.io/contact" style="color:#0C1B2A;text-decoration:underline;text-decoration-color:#D4BC8B;">Contact Us</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`
}

const TEAM_SIGN_OFF = ['Best,', 'The Access Oxbridge Team']
const CLAIRE_SIGN_OFF = ['Best,', 'Claire Marlowe', 'Access Oxbridge']
const THANKS_SIGN_OFF = ['Thank you,', 'The Access Oxbridge Team']

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
            title: 'New Message from your Mentor',
            preheader: 'You have a new message from your mentor on the Access Oxbridge portal.',
            paragraphs: [
                `Dear ${name},`,
                `You’ve received a new message from your mentor on the Access Oxbridge portal. ${link('Log in to view it and reply', STUDENT_MESSAGES_URL)}.`,
            ],
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
            title: 'New Message from your Student',
            preheader: 'You have a new message from your student on the Access Oxbridge portal.',
            paragraphs: [
                `Dear ${name},`,
                `You’ve received a new message from your student on the Access Oxbridge portal. ${link('Log in to view it and reply', MENTOR_MESSAGES_URL)}.`,
            ],
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
            title: "You've Been Matched with Your Mentor!",
            preheader: `You have been matched with your Access Oxbridge mentor, ${mentorName || 'your mentor'}.`,
            paragraphs: [
                `Dear ${sName},`,
                `Exciting news. You have been matched with your Access Oxbridge mentor, ${mName}.`,
                `${mName} is ready and waiting to get started, so we’d encourage you to ${link('log in to the portal', LOGIN_URL)} as soon as possible, introduce yourself, and get your first session booked in.`,
                `I have already sent you both a message on the portal to clarify where your communication should take place and to offer any support you need throughout your journey with us.`,
                `We’re really looking forward to seeing what you achieve together. If you have any questions at all, don’t hesitate to get in touch.`,
            ],
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
            title: "You've Been Matched with Your New Student!",
            preheader: `You have been matched with your new student, ${studentName || 'your new student'}.`,
            paragraphs: [
                `Dear ${mName},`,
                `You have been matched with your new student, ${sName}.`,
                `Please ${link('log in to the portal', LOGIN_URL)} at your earliest convenience to introduce yourself and coordinate a time for your first session.`,
                `I have already sent you both a message on the portal to clarify where your communication should take place and to offer any support along the way.`,
                `Thank you for being part of the Access Oxbridge team. As always, if you have any questions, we’re here.`,
            ],
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
            title: 'How did your first session go?',
            preheader: `We hope your first session with ${mentorName || 'your mentor'} went well.`,
            paragraphs: [
                `Dear ${sName},`,
                `We hope your first session with ${mName} went well yesterday!`,
                `First sessions are a great chance to get to know each other and start mapping out your journey, so we hope you came away feeling positive and motivated.`,
                `If you haven’t already, now is a great time to ${link('log in to the portal', LOGIN_URL)} and get your next session booked in while the momentum is there.`,
                `If anything came up that you’d like to flag, or you have any questions about how things work from here, Claire is on hand and happy to help. Just reach out on the portal.`,
                `We’re rooting for you.`,
            ],
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

interface SessionDetails {
    date: string
    time: string
}

function sessionDetailsParagraph({ date, time }: SessionDetails): string {
    return `<strong>Date:</strong> ${escapeHtml(date)}<br /><strong>Time:</strong> ${escapeHtml(time)}`
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
            title: 'Session Confirmed!',
            preheader: `Your next session with ${mentorName || 'your mentor'} is confirmed.`,
            paragraphs: [
                `Dear ${sName},`,
                `Great news! Your next session with ${mName} is confirmed.`,
                sessionDetailsParagraph(details),
                `We’d recommend having any materials, questions, or topics you want to cover ready ahead of time so you get the most out of it.`,
                `When it’s time, ${link('open your sessions in the portal', `${APP_URL}/dashboard/student/sessions`)} to join. Zoom links are only available there.`,
                `${link('Log in to the portal', LOGIN_URL)} anytime to message ${mName} or manage your upcoming sessions.`,
            ],
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
            title: 'Session Confirmation',
            preheader: `Your upcoming session with ${studentName || 'your student'} is booked in.`,
            paragraphs: [
                `Dear ${mName},`,
                `This is a confirmation that your upcoming session with ${sName} is booked in.`,
                sessionDetailsParagraph(details),
                `When it’s time, ${link('open your sessions in the portal', `${APP_URL}/dashboard/mentor/sessions`)} and use <strong>Start Session</strong> so you join Zoom as host.`,
                `If anything changes or you need to get in touch with your student ahead of the session, you can do so via ${link('the portal', LOGIN_URL)}.`,
            ],
            signOff: THANKS_SIGN_OFF,
        }),
    }
}

interface RescheduleSlotDetails {
    originalDate: string
    originalTime: string
    proposedDate: string
    proposedTime: string
}

function rescheduleProposalParagraph(details: RescheduleSlotDetails): string {
    return [
        `<strong>Current session:</strong> ${escapeHtml(details.originalDate)} at ${escapeHtml(details.originalTime)}`,
        `<strong>Proposed new time:</strong> ${escapeHtml(details.proposedDate)} at ${escapeHtml(details.proposedTime)}`,
    ].join('<br />')
}

/** Reschedule proposed → student. */
export function sessionRescheduleRequestedStudent(
    studentName: string,
    mentorName: string,
    details: RescheduleSlotDetails,
    initiatedBy: 'student' | 'mentor'
): EmailTemplate {
    const sName = escapeHtml(studentName || 'there')
    const mName = escapeHtml(mentorName || 'your mentor')
    const body =
        initiatedBy === 'mentor'
            ? `${mName} has requested to reschedule your upcoming session. Please review the proposed time in your Pending sessions and accept or decline.`
            : `We've sent your reschedule request to ${mName}. Your current session remains booked until they respond.`
    return {
        subject: 'Session Reschedule Request | Access Oxbridge',
        html: layout({
            title: 'Session Reschedule Request',
            preheader:
                initiatedBy === 'mentor'
                    ? `${mentorName || 'Your mentor'} has proposed a new time for your session.`
                    : `Your reschedule request has been sent to ${mentorName || 'your mentor'}.`,
            paragraphs: [
                `Dear ${sName},`,
                body,
                rescheduleProposalParagraph(details),
                `${link('Log in to the portal', LOGIN_URL)} to manage your sessions.`,
            ],
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/** Reschedule proposed → mentor. */
export function sessionRescheduleRequestedMentor(
    mentorName: string,
    studentName: string,
    details: RescheduleSlotDetails,
    initiatedBy: 'student' | 'mentor'
): EmailTemplate {
    const mName = escapeHtml(mentorName || 'there')
    const sName = escapeHtml(studentName || 'your student')
    const body =
        initiatedBy === 'student'
            ? `${sName} has requested to reschedule your upcoming session. Please review the proposed time and accept or decline.`
            : `We've sent your reschedule request to ${sName}. Your current session remains booked until they respond.`
    return {
        subject: 'Session Reschedule Request | Access Oxbridge',
        html: layout({
            title: 'Session Reschedule Request',
            preheader:
                initiatedBy === 'student'
                    ? `${studentName || 'Your student'} has proposed a new time for your session.`
                    : `Your reschedule request has been sent to ${studentName || 'your student'}.`,
            paragraphs: [
                `Dear ${mName},`,
                body,
                rescheduleProposalParagraph(details),
                `${link('Log in to the portal', LOGIN_URL)} to manage your sessions.`,
            ],
            signOff: THANKS_SIGN_OFF,
        }),
    }
}

/** Reschedule accepted → student. */
export function sessionRescheduleAcceptedStudent(
    studentName: string,
    mentorName: string,
    details: SessionDetails
): EmailTemplate {
    const sName = escapeHtml(studentName || 'there')
    const mName = escapeHtml(mentorName || 'your mentor')
    return {
        subject: 'Session Rescheduled | Access Oxbridge',
        html: layout({
            title: 'Session Rescheduled',
            preheader: `Your session with ${mentorName || 'your mentor'} has been moved to a new time.`,
            paragraphs: [
                `Dear ${sName},`,
                `Your session with ${mName} has been successfully rescheduled. The previous booking has been cancelled.`,
                sessionDetailsParagraph(details),
                `When it’s time, ${link('open your sessions in the portal', `${APP_URL}/dashboard/student/sessions`)} to join.`,
                `${link('Log in to the portal', LOGIN_URL)} anytime to manage your upcoming sessions.`,
            ],
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/** Reschedule accepted → mentor. */
export function sessionRescheduleAcceptedMentor(
    mentorName: string,
    studentName: string,
    details: SessionDetails
): EmailTemplate {
    const mName = escapeHtml(mentorName || 'there')
    const sName = escapeHtml(studentName || 'your student')
    return {
        subject: 'Session Rescheduled | Access Oxbridge',
        html: layout({
            title: 'Session Rescheduled',
            preheader: `Your session with ${studentName || 'your student'} has been moved to a new time.`,
            paragraphs: [
                `Dear ${mName},`,
                `Your session with ${sName} has been successfully rescheduled. The previous booking has been cancelled.`,
                sessionDetailsParagraph(details),
                `When it’s time, ${link('open your sessions in the portal', `${APP_URL}/dashboard/mentor/sessions`)} and use <strong>Start Session</strong> so you join Zoom as host.`,
                `If anything changes, you can manage sessions via ${link('the portal', LOGIN_URL)}.`,
            ],
            signOff: THANKS_SIGN_OFF,
        }),
    }
}

/** Reschedule declined / withdrawn → student. */
export function sessionRescheduleDeclinedStudent(
    studentName: string,
    mentorName: string,
    originalDate: string,
    originalTime: string,
    withdrawnByProposer: boolean
): EmailTemplate {
    const sName = escapeHtml(studentName || 'there')
    const mName = escapeHtml(mentorName || 'your mentor')
    const body = withdrawnByProposer
        ? `The reschedule request for your session with ${mName} has been withdrawn. Your original session still stands.`
        : `The reschedule request for your session with ${mName} was declined. Your original session still stands.`
    return {
        subject: 'Reschedule Update | Access Oxbridge',
        html: layout({
            title: 'Reschedule Update',
            preheader: 'Your original session time is unchanged.',
            paragraphs: [
                `Dear ${sName},`,
                body,
                `<strong>Original session:</strong> ${escapeHtml(originalDate)} at ${escapeHtml(originalTime)}`,
                `${link('Log in to the portal', LOGIN_URL)} to view your upcoming sessions.`,
            ],
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/** Reschedule declined / withdrawn → mentor. */
export function sessionRescheduleDeclinedMentor(
    mentorName: string,
    studentName: string,
    originalDate: string,
    originalTime: string,
    withdrawnByProposer: boolean
): EmailTemplate {
    const mName = escapeHtml(mentorName || 'there')
    const sName = escapeHtml(studentName || 'your student')
    const body = withdrawnByProposer
        ? `The reschedule request for your session with ${sName} has been withdrawn. Your original session still stands.`
        : `The reschedule request for your session with ${sName} was declined. Your original session still stands.`
    return {
        subject: 'Reschedule Update | Access Oxbridge',
        html: layout({
            title: 'Reschedule Update',
            preheader: 'Your original session time is unchanged.',
            paragraphs: [
                `Dear ${mName},`,
                body,
                `<strong>Original session:</strong> ${escapeHtml(originalDate)} at ${escapeHtml(originalTime)}`,
                `${link('Log in to the portal', LOGIN_URL)} to view your upcoming sessions.`,
            ],
            signOff: THANKS_SIGN_OFF,
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
            title: 'Time to book your next session!',
            preheader: `It’s been a little while since your last session with ${mentorName || 'your mentor'}.`,
            paragraphs: [
                `Dear ${sName},`,
                `We noticed it’s been a little while since your last session with ${mName}. With your Oxbridge application in mind, keeping up a consistent pace really does make a difference.`,
                `${link('Log in to the portal', LOGIN_URL)} to get your next session booked in and keep the momentum going.`,
                `If anything has come up or you’d like to chat to the team, just reach out to Claire on the portal and she will be more than happy to help.`,
            ],
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
            title: `Checking in on your sessions with ${sNameRaw}`,
            preheader: `It looks like some time has passed since your last session with ${sNameRaw}.`,
            paragraphs: [
                `Dear ${mName},`,
                `We wanted to check in as it looks like some time has passed since your last session with ${sName}.`,
                `When you get a chance, please ${link('log in to the portal', LOGIN_URL)} and reach out to coordinate your next one. Keeping sessions regular is really important at this stage of the application cycle.`,
                `As always, if there’s anything you’d like to flag or discuss with the team, just reach out on the portal.`,
            ],
            signOff: THANKS_SIGN_OFF,
        }),
    }
}

/** 1-hour reminder → student. `timeLabel` already includes the zone, e.g. "14:00 BST". */
export function sessionReminderStudent(
    studentName: string,
    mentorName: string,
    timeLabel: string
): EmailTemplate {
    const sName = escapeHtml(studentName || 'there')
    const mName = escapeHtml(mentorName || 'your mentor')
    const when = escapeHtml(timeLabel)
    return {
        subject: 'Reminder: your session starts soon | Access Oxbridge',
        html: layout({
            title: 'Your session starts soon',
            preheader: `Your session with ${mentorName || 'your mentor'} starts at ${timeLabel} today.`,
            paragraphs: [
                `Dear ${sName},`,
                `This is a friendly reminder that your session with ${mName} starts at <strong>${when}</strong> today.`,
                `${link('Open your sessions in the portal', `${APP_URL}/dashboard/student/sessions`)} when you’re ready — we’d recommend hopping on a couple of minutes early.`,
            ],
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/** 1-hour reminder → mentor. `timeLabel` already includes the zone, e.g. "14:00 BST". */
export function sessionReminderMentor(
    mentorName: string,
    studentName: string,
    timeLabel: string
): EmailTemplate {
    const mName = escapeHtml(mentorName || 'there')
    const sName = escapeHtml(studentName || 'your student')
    const when = escapeHtml(timeLabel)
    return {
        subject: 'Reminder: your session starts soon | Access Oxbridge',
        html: layout({
            title: 'Your session starts soon',
            preheader: `Your session with ${studentName || 'your student'} starts at ${timeLabel} today.`,
            paragraphs: [
                `Dear ${mName},`,
                `This is a friendly reminder that your session with ${sName} starts at <strong>${when}</strong> today.`,
                `${link('Open your sessions in the portal', `${APP_URL}/dashboard/mentor/sessions`)} and use <strong>Start Session</strong> so you join Zoom as host.`,
            ],
            signOff: THANKS_SIGN_OFF,
        }),
    }
}

/** Invoice submitted ("Sent to Finance") → admin. */
export function invoiceSubmittedAdmin(
    details: { mentorName: string; invoiceNumber: string; amountLabel: string; payoutsUrl: string }
): EmailTemplate {
    const mentor = escapeHtml(details.mentorName || 'A mentor')
    const num = escapeHtml(details.invoiceNumber || '')
    const amount = escapeHtml(details.amountLabel || '')
    return {
        subject: `Invoice ${details.invoiceNumber} sent to finance | Access Oxbridge`,
        html: layout({
            title: 'Invoice sent to finance',
            preheader: `${details.mentorName} sent invoice ${details.invoiceNumber} (${details.amountLabel}) to finance.`,
            paragraphs: [
                `Hi team,`,
                `<strong>${mentor}</strong> has sent an invoice to finance and it’s ready to pay.`,
                `<strong>Invoice:</strong> ${num}<br /><strong>Amount:</strong> ${amount}`,
                `${link('Review and pay it in the admin payouts queue', details.payoutsUrl)}.`,
            ],
            signOff: TEAM_SIGN_OFF,
        }),
    }
}

/**
 * Post-payout remittance → mentor. Sent when an invoice is paid. The invoice and
 * remittance-advice PDFs are ATTACHED to the email (no download link — raw signed
 * storage URLs get flagged as unsafe by mail clients), with a safe portal link.
 */
export function paymentRemittanceMentor(
    mentorName: string,
    details: { invoiceNumber: string; amountLabel: string; periodLabel: string; portalUrl: string }
): EmailTemplate {
    const mName = escapeHtml(mentorName || 'there')
    const num = escapeHtml(details.invoiceNumber || '')
    const amount = escapeHtml(details.amountLabel || '')
    const period = escapeHtml(details.periodLabel || '')
    const detailLines = [
        `<strong>Invoice:</strong> ${num}`,
        `<strong>Amount:</strong> ${amount}`,
        period ? `<strong>Period:</strong> ${period}` : '',
    ].filter(Boolean).join('<br />')
    return {
        subject: `You’ve been paid ${details.amountLabel} | Access Oxbridge`,
        html: layout({
            title: 'Payment Confirmation',
            preheader: `You’ve been paid ${details.amountLabel} for invoice ${details.invoiceNumber}.`,
            paragraphs: [
                `Dear ${mName},`,
                `Great news - you’ve been paid for your recent mentoring sessions with Access Oxbridge.`,
                detailLines,
                `Your invoice and remittance advice are attached to this email for your records. You can also ${link('view your payments in the portal', details.portalUrl)}.`,
                `If you have any questions about your payment, just reach out to the team on the portal.`,
            ],
            signOff: THANKS_SIGN_OFF,
        }),
    }
}
