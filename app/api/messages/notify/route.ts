import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { newMessageToStudent, newMessageToMentor } from '@/lib/email/templates'

/**
 * Fire-and-forget endpoint called by the chat client after a message is sent.
 *
 * Sends a branded "new message" email to the recipient — but throttled per
 * conversation so a rapid back-and-forth doesn't spam the inbox: we only email
 * when the recipient has unread messages AND no notification email has been
 * sent for this conversation within the cooldown window.
 */
const COOLDOWN_MS = 2 * 60 * 60 * 1000 // 2 hours

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
            .select('id, student_id, mentor_id, type, student_notified_at, mentor_notified_at')
            .eq('id', conversationId)
            .single()

        if (!conv) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        // Only mentor↔student threads get "new message" emails. Support/admin
        // threads are handled separately and don't use this notification.
        if (conv.type !== 'mentor' || !conv.mentor_id) {
            return NextResponse.json({ skipped: 'not a mentor conversation' })
        }

        // Recipient is whichever core participant didn't send the message.
        let recipientId: string
        let recipientColumn: 'student_notified_at' | 'mentor_notified_at'
        let direction: 'to_student' | 'to_mentor'

        if (user.id === conv.mentor_id) {
            recipientId = conv.student_id
            recipientColumn = 'student_notified_at'
            direction = 'to_student'
        } else if (user.id === conv.student_id) {
            recipientId = conv.mentor_id
            recipientColumn = 'mentor_notified_at'
            direction = 'to_mentor'
        } else {
            // Admin / third-party intervention — no "new message" email.
            return NextResponse.json({ skipped: 'sender is not a core participant' })
        }

        // Throttle: skip if we emailed this recipient for this conversation recently.
        const lastNotified = conv[recipientColumn] as string | null
        if (lastNotified && Date.now() - new Date(lastNotified).getTime() < COOLDOWN_MS) {
            return NextResponse.json({ skipped: 'within cooldown window' })
        }

        // Only email when the recipient actually has something unread.
        const { count: unreadCount } = await admin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', recipientId)
            .eq('is_read', false)

        if (!unreadCount || unreadCount < 1) {
            return NextResponse.json({ skipped: 'no unread messages for recipient' })
        }

        const { data: recipient } = await admin
            .from('profiles')
            .select('full_name, email')
            .eq('id', recipientId)
            .single()

        if (!recipient?.email) {
            return NextResponse.json({ skipped: 'recipient has no email' })
        }

        const tpl =
            direction === 'to_student'
                ? newMessageToStudent(recipient.full_name || '')
                : newMessageToMentor(recipient.full_name || '')

        const result = await sendEmail({
            from: EMAIL_SENDER_TEAM,
            to: recipient.email,
            subject: tpl.subject,
            html: tpl.html,
        })

        // Record the send so the cooldown applies to subsequent messages.
        if (result.ok) {
            await admin
                .from('conversations')
                .update({ [recipientColumn]: new Date().toISOString() })
                .eq('id', conversationId)
        }

        return NextResponse.json({ sent: result.ok, error: result.error })
    } catch (error) {
        console.error('[messages/notify]', error)
        return NextResponse.json({ error: 'Failed to process notification' }, { status: 500 })
    }
}
