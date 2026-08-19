import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyServiceToken } from '@/lib/service-auth'
import { CHAT_BUCKET, toChatAttachments } from '@/lib/chat-attachments'

/**
 * GET /api/service/messages/conversations/[id]
 *
 * One full thread, oldest message first, for the CRM's read-only view.
 *
 * READ-ONLY BY CONSTRUCTION — SELECTs plus short-lived storage signing, no
 * mutations of any kind. Critically it does NOT write messages.is_read, so an
 * admin reading a thread from the CRM leaves the portal's unread state exactly
 * as it found it.
 *
 * Paging is backwards through history: the newest window is returned first,
 * and `next_before` walks towards older messages.
 *
 * Query params:
 *   limit  1-500, default 200
 *   before ISO timestamp — return messages strictly older than this
 *
 * Auth: Authorization: Bearer <PORTAL_SERVICE_TOKEN>
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

/** Attachments are private; the CRM lives on another project and cannot sign. */
const SIGNED_URL_TTL_SECONDS = 5 * 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readInt(raw: string | null, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(raw ?? '', 10)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(parsed, min), max)
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = verifyServiceToken(req)
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params

    // Validated before it reaches Postgres: an unparseable uuid would otherwise
    // surface as a 500 from the driver rather than a clear client error.
    if (!id || !UUID_RE.test(id)) {
        return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 })
    }

    const url = new URL(req.url)
    const limit = readInt(url.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT)
    const before = url.searchParams.get('before')

    if (before && Number.isNaN(Date.parse(before))) {
        return NextResponse.json({ error: 'before must be an ISO timestamp' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select(
            `
            id,
            student_id,
            mentor_id,
            type,
            created_at,
            last_message_at,
            student:profiles!conversations_student_id_fkey ( id, full_name, email ),
            mentor:profiles!conversations_mentor_id_fkey ( id, full_name, email )
            `
        )
        .eq('id', id)
        .maybeSingle()

    if (conversationError) {
        console.error('[service/messages] conversation fetch failed:', conversationError.message)
        return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 })
    }
    if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Fetch newest-first so `limit` takes the most recent window, then reverse
    // for display. One extra row tells us whether older history remains
    // without a second count query.
    let messageQuery = supabase
        .from('messages')
        .select('id, sender_id, content, attachments, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1)

    if (before) messageQuery = messageQuery.lt('created_at', before)

    const { data: messageRows, error: messageError } = await messageQuery

    if (messageError) {
        console.error('[service/messages] message fetch failed:', messageError.message)
        return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
    }

    const fetched = messageRows ?? []
    const hasMore = fetched.length > limit
    const window = hasMore ? fetched.slice(0, limit) : fetched
    const ordered = [...window].reverse()

    // Resolve sender identity. Participants come off the conversation; anyone
    // else who has posted is an Access Oxbridge admin, so look those up in one
    // query rather than per message.
    const studentId = conversation.student_id as string | null
    const mentorId = conversation.mentor_id as string | null
    const student = conversation.student as { full_name?: string | null } | null
    const mentor = conversation.mentor as { full_name?: string | null } | null

    const otherSenderIds = [
        ...new Set(
            ordered
                .map((m) => m.sender_id as string)
                .filter((senderId) => senderId !== studentId && senderId !== mentorId)
        ),
    ]

    const adminNames = new Map<string, string>()
    if (otherSenderIds.length > 0) {
        const { data: admins } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', otherSenderIds)
        for (const admin of admins ?? []) {
            if (admin.full_name) adminNames.set(admin.id, admin.full_name)
        }
    }

    function senderFor(senderId: string): { name: string; role: 'student' | 'mentor' | 'admin' } {
        if (senderId && senderId === studentId) {
            return { name: student?.full_name || 'Student', role: 'student' }
        }
        if (senderId && senderId === mentorId) {
            return { name: mentor?.full_name || 'Mentor', role: 'mentor' }
        }
        return { name: adminNames.get(senderId) || 'Access Oxbridge', role: 'admin' }
    }

    // Sign every attachment path in this window in a single call. The CRM is on
    // a different Supabase project and the bucket is private, so it has no way
    // to sign these itself — and we are not making the bucket public.
    const paths = ordered
        .flatMap((m) => toChatAttachments(m.attachments) ?? [])
        .map((a) => a.path)
        .filter((path) => path && !path.startsWith('pending:'))

    const signedUrls = new Map<string, string>()
    if (paths.length > 0) {
        const { data: signed, error: signError } = await supabase.storage
            .from(CHAT_BUCKET)
            .createSignedUrls([...new Set(paths)], SIGNED_URL_TTL_SECONDS)

        if (signError) {
            // A signing failure must not blank the thread — the words matter
            // more than the pictures. Attachments degrade to metadata only.
            console.error('[service/messages] attachment signing failed:', signError.message)
        }
        for (const entry of signed ?? []) {
            if (entry.signedUrl && entry.path) signedUrls.set(entry.path, entry.signedUrl)
        }
    }

    const messages = ordered.map((m) => {
        const sender = senderFor(m.sender_id as string)
        const attachments = toChatAttachments(m.attachments) ?? []

        return {
            id: m.id,
            sender_id: m.sender_id,
            sender,
            content: m.content ?? '',
            created_at: m.created_at,
            attachments: attachments.map((a) => ({
                name: a.name,
                mime: a.mime ?? null,
                size: a.size ?? null,
                kind: a.kind ?? 'file',
                width: a.width ?? null,
                height: a.height ?? null,
                signed_url: signedUrls.get(a.path) ?? null,
            })),
        }
    })

    return NextResponse.json(
        {
            conversation: {
                id: conversation.id,
                type: conversation.type ?? 'mentor',
                student_id: studentId,
                mentor_id: mentorId,
                student: conversation.student ?? null,
                mentor: conversation.mentor ?? null,
                created_at: conversation.created_at,
                last_message_at: conversation.last_message_at ?? conversation.created_at,
            },
            messages,
            has_more: hasMore,
            // Cursor for the next (older) page; null when the thread is exhausted.
            next_before: hasMore && ordered.length > 0 ? ordered[0].created_at : null,
            signed_url_ttl_seconds: SIGNED_URL_TTL_SECONDS,
        },
        { headers: { 'Cache-Control': 'no-store' } }
    )
}
