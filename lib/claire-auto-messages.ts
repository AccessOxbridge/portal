/**
 * Automatic Claire Marlowe chat messages.
 *
 * All writes use the service-role client. Callers must treat this as
 * fire-and-forget: nothing here should fail login, approval, or matching.
 */

import { EMAIL_SENDER_CLAIRE, sendEmail } from '@/lib/email/client'
import {
    newMessageFromClaireToMentor,
    newMessageFromClaireToStudent,
} from '@/lib/email/templates'
import { createAdminClient } from '@/utils/supabase/admin'

const STUDENT_WELCOME_SNIPPET =
    'congratulations on taking this step towards your Oxford or Cambridge application'
const MENTOR_WELCOME_SNIPPET = 'been really impressed by your profile'
const MATCH_INTRO_SNIPPET = 'This group chat is your dedicated space for the programme'

export function firstNameFrom(fullName: string | null | undefined): string {
    const first = (fullName || '').trim().split(/\s+/)[0]
    return first || 'there'
}

function studentWelcomeBody(firstName: string): string {
    return [
        `Hi ${firstName},`,
        '',
        `Welcome to Access Oxbridge, and congratulations on taking this step towards your Oxford or Cambridge application. I'm Claire, Senior Strategist here at Access Oxbridge.`,
        '',
        `To explain my role: I oversee your journey with us and will be monitoring your sessions on the portal to make sure everything stays on track and you're getting the most from your time with us. I won't be conducting the sessions themselves, that's the job of your dedicated mentor, who you'll be matched with shortly. Think of me as the person keeping an eye on the bigger picture and making sure your support is exactly what it should be. You can reach out to me here any time.`,
        '',
        `Now that you're logged in, please complete your profile in full and start preparing any materials you'd like to bring to your first session, such as your draft personal statement, target course details, or questions you want to work through. The more prepared you are, the better your mentor can support you.`,
        '',
        `In the meantime, our onboarding team are working hard to match you with the right mentor, and once they have, you can introduce yourself and get your first session booked in!`,
        '',
        `We're really looking forward to working with you.`,
        '',
        'Best,',
        'Claire',
    ].join('\n')
}

function mentorWelcomeBody(firstName: string): string {
    return [
        `Hi ${firstName},`,
        '',
        `Welcome to Access Oxbridge! We've been really impressed by your profile and we're excited to have you on board. I'm Claire, and I'll be your point of contact here on the portal, so do reach out any time.`,
        '',
        `To get you ready for students, please make sure every aspect of your onboarding and profile is complete. The portal will show you anything still outstanding.`,
        '',
        `Once that's all done, we look forward to matching you up with your first student.`,
        '',
        'Great to have you with us!',
        'Claire',
    ].join('\n')
}

function matchIntroBody(studentFirst: string, mentorFirst: string): string {
    return [
        `Hi ${studentFirst} and ${mentorFirst},`,
        `I hope you're well. I'm Claire Marlowe, Senior Strategist at Access Oxbridge. Lovely to meet you both. This group chat is your dedicated space for the programme. Please use it to schedule and coordinate sessions, share anything useful ahead of meetings, and keep in touch between sessions. I'll be here in the background should anything come up that needs input from the team, but it is very much for you to use this between yourselves. Don't hesitate to reach out if you have any questions. Looking forward to seeing great work from you both!`,
    ].join('\n')
}

function isUniqueViolation(error: { code?: string } | null): boolean {
    return error?.code === '23505'
}

async function resolveClaireAdminId(
    admin: ReturnType<typeof createAdminClient>
): Promise<string | null> {
    const { data } = await admin
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'admin-dev'])
        .limit(1)
        .maybeSingle()
    return data?.id ?? null
}

async function ensureDirectClaireThread(
    admin: ReturnType<typeof createAdminClient>,
    recipientId: string,
    role: 'student' | 'mentor',
    adminId: string
): Promise<string | null> {
    const type = role === 'student' ? 'support' : 'mentor_support'
    const matchColumn = role === 'student' ? 'student_id' : 'mentor_id'

    const { data: existing } = await admin
        .from('conversations')
        .select('id')
        .eq(matchColumn, recipientId)
        .eq('type', type)
        .maybeSingle()

    if (existing) return existing.id

    const insertRow =
        role === 'student'
            ? {
                  student_id: recipientId,
                  mentor_id: null,
                  admin_id: adminId,
                  type: 'support' as const,
              }
            : {
                  student_id: null,
                  mentor_id: recipientId,
                  admin_id: adminId,
                  type: 'mentor_support' as const,
              }

    const { data: created, error } = await admin
        .from('conversations')
        .insert(insertRow as never)
        .select('id')
        .single()

    if (created) return created.id

    if (isUniqueViolation(error)) {
        const { data: raced } = await admin
            .from('conversations')
            .select('id')
            .eq(matchColumn, recipientId)
            .eq('type', type)
            .maybeSingle()
        return raced?.id ?? null
    }

    console.error('claire-auto-messages: failed to create thread', error?.message)
    return null
}

async function alreadySent(
    admin: ReturnType<typeof createAdminClient>,
    conversationId: string,
    snippet: string
): Promise<boolean> {
    const { count, error } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .ilike('content', `%${snippet}%`)

    if (error) {
        console.error('claire-auto-messages: alreadySent query failed', error)
        return false
    }
    return (count ?? 0) > 0
}

async function insertClaireMessage(
    admin: ReturnType<typeof createAdminClient>,
    conversationId: string,
    senderId: string,
    content: string,
    snippet: string
): Promise<boolean> {
    if (await alreadySent(admin, conversationId, snippet)) {
        return false
    }

    const { error } = await admin.from('messages').insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
    })

    if (error) {
        console.error('claire-auto-messages: insert failed', error)
        return false
    }

    const { error: stampError } = await admin
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

    if (stampError) {
        console.error('claire-auto-messages: last_message_at update failed', stampError)
    }

    return true
}

function rowId(data: { id: string } | { id: string }[] | null | undefined): string | null {
    if (!data) return null
    if (Array.isArray(data)) return data[0]?.id ?? null
    return data.id ?? null
}

async function ensureMentorPairThread(
    admin: ReturnType<typeof createAdminClient>,
    studentId: string,
    mentorId: string,
    adminId: string
): Promise<string | null> {
    const { data: existing } = await admin
        .from('conversations')
        .select('id')
        .eq('student_id', studentId)
        .eq('mentor_id', mentorId)
        .eq('type', 'mentor')
        .maybeSingle()

    if (existing?.id) {
        await admin
            .from('conversations')
            .update({ admin_id: adminId })
            .eq('id', existing.id)
            .is('admin_id', null)
        return existing.id
    }

    const { data: created, error } = await admin
        .from('conversations')
        .insert({
            student_id: studentId,
            mentor_id: mentorId,
            admin_id: adminId,
            type: 'mentor' as const,
        })
        .select('id')

    const createdId = rowId(created)
    if (createdId) return createdId

    if (error) {
        console.error('claire-auto-messages: mentor thread insert failed', error)
    }

    const { data: raced } = await admin
        .from('conversations')
        .select('id')
        .eq('student_id', studentId)
        .eq('mentor_id', mentorId)
        .eq('type', 'mentor')
        .maybeSingle()

    return raced?.id ?? null
}

async function emailClaireNewMessage(
    admin: ReturnType<typeof createAdminClient>,
    recipientId: string,
    direction: 'to_student' | 'to_mentor'
): Promise<void> {
    const { data: recipient } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', recipientId)
        .single()

    if (!recipient?.email) return

    const tpl =
        direction === 'to_student'
            ? newMessageFromClaireToStudent(recipient.full_name || '')
            : newMessageFromClaireToMentor(recipient.full_name || '')

    const result = await sendEmail({
        from: EMAIL_SENDER_CLAIRE,
        to: recipient.email,
        subject: tpl.subject,
        html: tpl.html,
    })

    if (!result.ok) {
        console.error('claire-auto-messages: email failed', result.error)
    }
}

async function loadFullName(
    admin: ReturnType<typeof createAdminClient>,
    userId: string
): Promise<string | null> {
    const { data } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
    return data?.full_name ?? null
}

/** Student Help & Support thread — first successful portal login. */
export async function sendStudentFirstLoginMessage(studentId: string): Promise<void> {
    try {
        const admin = createAdminClient()
        const { data: profile } = await admin
            .from('profiles')
            .select('role, full_name')
            .eq('id', studentId)
            .maybeSingle()

        if (!profile || profile.role !== 'student') return

        const claireId = await resolveClaireAdminId(admin)
        if (!claireId) {
            console.error('claire-auto-messages: no admin profile to send as Claire')
            return
        }

        const conversationId = await ensureDirectClaireThread(
            admin,
            studentId,
            'student',
            claireId
        )
        if (!conversationId) return

        const inserted = await insertClaireMessage(
            admin,
            conversationId,
            claireId,
            studentWelcomeBody(firstNameFrom(profile.full_name)),
            STUDENT_WELCOME_SNIPPET
        )
        if (inserted) {
            await emailClaireNewMessage(admin, studentId, 'to_student')
        }
    } catch (error) {
        console.error('claire-auto-messages: student first-login failed', error)
    }
}

/** Mentor Claire thread — once the mentor is set active. */
export async function sendMentorApprovedMessage(mentorId: string): Promise<void> {
    try {
        const admin = createAdminClient()
        const fullName = await loadFullName(admin, mentorId)
        const claireId = await resolveClaireAdminId(admin)
        if (!claireId) {
            console.error('claire-auto-messages: no admin profile to send as Claire')
            return
        }

        const conversationId = await ensureDirectClaireThread(
            admin,
            mentorId,
            'mentor',
            claireId
        )
        if (!conversationId) return

        const inserted = await insertClaireMessage(
            admin,
            conversationId,
            claireId,
            mentorWelcomeBody(firstNameFrom(fullName)),
            MENTOR_WELCOME_SNIPPET
        )
        if (inserted) {
            await emailClaireNewMessage(admin, mentorId, 'to_mentor')
        }
    } catch (error) {
        console.error('claire-auto-messages: mentor approved message failed', error)
    }
}

/** Intervention in the student↔mentor group chat after a match. */
export async function sendMatchIntroMessage(args: {
    studentId: string
    mentorId: string
}): Promise<void> {
    try {
        const admin = createAdminClient()
        const claireId = await resolveClaireAdminId(admin)
        if (!claireId) {
            console.error('claire-auto-messages: no admin profile to send as Claire')
            return
        }

        const conversationId = await ensureMentorPairThread(
            admin,
            args.studentId,
            args.mentorId,
            claireId
        )
        if (!conversationId) {
            console.error('claire-auto-messages: no mentor conversation for match intro', args)
            return
        }

        const [studentName, mentorName] = await Promise.all([
            loadFullName(admin, args.studentId),
            loadFullName(admin, args.mentorId),
        ])

        const body = `[ADMIN] ${matchIntroBody(
            firstNameFrom(studentName),
            firstNameFrom(mentorName)
        )}`

        const inserted = await insertClaireMessage(
            admin,
            conversationId,
            claireId,
            body,
            MATCH_INTRO_SNIPPET
        )
        if (inserted) {
            await Promise.all([
                emailClaireNewMessage(admin, args.studentId, 'to_student'),
                emailClaireNewMessage(admin, args.mentorId, 'to_mentor'),
            ])
        }
    } catch (error) {
        console.error('claire-auto-messages: match intro failed', error)
    }
}
