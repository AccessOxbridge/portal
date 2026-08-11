import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_TEAM, EMAIL_SENDER_CLAIRE } from '@/lib/email/client'
import {
    newMessageToStudent,
    newMessageToMentor,
    newMessageFromClaireToStudent,
    newMessageFromClaireToMentor,
} from '@/lib/email/templates'

/**
 * Fire-and-forget endpoint called by the chat client after a message is sent.
 *
 * Sends a branded "new message" email to the recipient — but throttled per
 * conversation so a rapid back-and-forth doesn't spam the inbox: we only email
 * when the recipient has unread messages AND no notification email has been
 * sent for this conversation within the cooldown window.
 *
 * Admin (Claire) messages also notify: both parties in a mentor thread, the
 * student in a support thread, or the mentor in a mentor_support thread.
 */
const COOLDOWN_MS = 2 * 60 * 60 * 1000 // 2 hours

type NotifyColumn = 'student_notified_at' | 'mentor_notified_at'
type RecipientTarget = {
    id: string
    column: NotifyColumn
    direction: 'to_student' | 'to_mentor'
}

type ConversationRow = {
    id: string
    student_id: string | null
    mentor_id: string | null
    admin_id: string | null
    type: string | null
    student_notified_at: string | null
    mentor_notified_at: string | null
}

async function notifyRecipient(
    admin: ReturnType<typeof createAdminClient>,
    conv: ConversationRow,
    target: RecipientTarget,
    fromClaire: boolean,
    options?: { skipCooldown?: boolean },
): Promise<{ id: string; sent?: boolean; skipped?: string; error?: string }> {
    const lastNotified = conv[target.column]
    if (
        !options?.skipCooldown &&
        lastNotified &&
        Date.now() - new Date(lastNotified).getTime() < COOLDOWN_MS
    ) {
        return { id: target.id, skipped: 'within cooldown window' }
    }

    const { count: unreadCount } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', target.id)
        .eq('is_read', false)

    if (!unreadCount || unreadCount < 1) {
        return { id: target.id, skipped: 'no unread messages for recipient' }
    }

    const { data: recipient } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', target.id)
        .single()

    if (!recipient?.email) {
        return { id: target.id, skipped: 'recipient has no email' }
    }

    const tpl = fromClaire
        ? target.direction === 'to_student'
            ? newMessageFromClaireToStudent(recipient.full_name || '')
            : newMessageFromClaireToMentor(recipient.full_name || '')
        : target.direction === 'to_student'
          ? newMessageToStudent(recipient.full_name || '')
          : newMessageToMentor(recipient.full_name || '')

    const result = await sendEmail({
        from: fromClaire ? EMAIL_SENDER_CLAIRE : EMAIL_SENDER_TEAM,
        to: recipient.email,
        subject: tpl.subject,
        html: tpl.html,
    })

    if (result.ok) {
        const now = new Date().toISOString()
        // Branched rather than a computed key: `{ [target.column]: ... }` widens
        // to a string index signature, which the generated Update type rejects.
        const patch =
            target.column === 'student_notified_at'
                ? { student_notified_at: now }
                : { mentor_notified_at: now }

        await admin.from('conversations').update(patch).eq('id', conv.id)
    }

    return { id: target.id, sent: result.ok, error: result.error }
}

function adminRecipients(conv: ConversationRow): RecipientTarget[] {
    const targets: RecipientTarget[] = []

    if (conv.type === 'mentor') {
        if (conv.student_id) {
            targets.push({
                id: conv.student_id,
                column: 'student_notified_at',
                direction: 'to_student',
            })
        }
        if (conv.mentor_id) {
            targets.push({
                id: conv.mentor_id,
                column: 'mentor_notified_at',
                direction: 'to_mentor',
            })
        }
    } else if (conv.type === 'support' && conv.student_id) {
        targets.push({
            id: conv.student_id,
            column: 'student_notified_at',
            direction: 'to_student',
        })
    } else if (conv.type === 'mentor_support' && conv.mentor_id) {
        targets.push({
            id: conv.mentor_id,
            column: 'mentor_notified_at',
            direction: 'to_mentor',
        })
    }

    return targets
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json().catch(() => null)
        const conversationId = body?.conversationId as string | undefined
        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
        }

        const admin = createAdminClient()
        const { data: conv } = await admin
            .from('conversations')
            .select('id, student_id, mentor_id, admin_id, type, student_notified_at, mentor_notified_at')
            .eq('id', conversationId)
            .single()

        if (!conv) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        const { data: senderProfile } = await admin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdminSender =
            !!senderProfile &&
            (['admin', 'admin-dev'].includes(senderProfile.role) ||
                (conv.admin_id != null && user.id === conv.admin_id))

        // Claire / admin message → email the relevant participant(s).
        if (isAdminSender) {
            const targets = adminRecipients(conv)
            if (targets.length === 0) {
                return NextResponse.json({ skipped: 'no recipients for admin message' })
            }

            const results = []
            for (const target of targets) {
                // Claire interventions are intentional and should not be silenced by
                // a recent mentor↔student "new message" email on the same thread.
                results.push(await notifyRecipient(admin, conv, target, true, { skipCooldown: true }))
            }

            console.log('[messages/notify] admin/Claire results', {
                conversationId,
                results,
            })
            return NextResponse.json({ results })
        }

        // Only mentor↔student threads get "new message" emails for non-admin senders.
        // Support / mentor_support replies from student or mentor do not email Claire.
        if (conv.type !== 'mentor' || !conv.mentor_id) {
            return NextResponse.json({ skipped: 'not a mentor conversation' })
        }

        let target: RecipientTarget

        if (user.id === conv.mentor_id) {
            if (!conv.student_id) {
                return NextResponse.json({ skipped: 'no student on conversation' })
            }
            target = {
                id: conv.student_id,
                column: 'student_notified_at',
                direction: 'to_student',
            }
        } else if (user.id === conv.student_id) {
            target = {
                id: conv.mentor_id,
                column: 'mentor_notified_at',
                direction: 'to_mentor',
            }
        } else {
            return NextResponse.json({ skipped: 'sender is not a core participant' })
        }

        const result = await notifyRecipient(admin, conv, target, false)
        return NextResponse.json(result)
    } catch (error) {
        console.error('[messages/notify]', error)
        return NextResponse.json({ error: 'Failed to process notification' }, { status: 500 })
    }
}
