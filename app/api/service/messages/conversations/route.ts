import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyServiceToken } from '@/lib/service-auth'
import { loadGroupMembers, type ChatGroupMember } from '@/lib/chat-groups'

/**
 * GET /api/service/messages/conversations
 *
 * Read-only conversation index for the CRM's "Portal Messages" view. Returns
 * every conversation an admin can see — student↔mentor, student↔support,
 * mentor↔support and admin-created groups alike.
 *
 * READ-ONLY BY CONSTRUCTION. This file issues SELECTs and nothing else. There
 * is deliberately no POST/PATCH/DELETE export, so Next answers those with 405.
 * In particular it never touches messages.is_read or
 * conversation_participants.last_read_at: viewing a thread from the CRM must
 * not clear a student's unread badge in the portal.
 *
 * Query params:
 *   limit  1-200, default 50
 *   offset >= 0, default 0
 *   type   mentor | support | mentor_support | group   (optional filter)
 *   q      free text matched against participant name/email (optional)
 *
 * Auth: Authorization: Bearer <PORTAL_SERVICE_TOKEN>
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const PREVIEW_CHARS = 140
const CONVERSATION_TYPES = ['mentor', 'support', 'mentor_support', 'group'] as const

type ConversationType = (typeof CONVERSATION_TYPES)[number]

/** Clamp a caller-supplied integer into range, falling back on nonsense. */
function readInt(raw: string | null, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(raw ?? '', 10)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(parsed, min), max)
}

function crmParticipants(members: ChatGroupMember[]) {
    return members
        .filter((m) => m.role !== 'admin')
        .map((m) => ({
            id: m.user_id,
            full_name: m.full_name,
            email: m.email,
            role: m.role,
        }))
}

/** PostgREST `.or()` values are comma-separated, so a comma in `q` would inject. */
function escapeForOr(value: string): string {
    return value.replace(/[,()"\\]/g, ' ')
}

export async function GET(req: Request) {
    const auth = verifyServiceToken(req)
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const url = new URL(req.url)
    const limit = readInt(url.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT)
    const offset = readInt(url.searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER)
    const rawType = url.searchParams.get('type')
    const q = (url.searchParams.get('q') || '').trim()

    if (rawType && !CONVERSATION_TYPES.includes(rawType as ConversationType)) {
        return NextResponse.json(
            { error: `type must be one of: ${CONVERSATION_TYPES.join(', ')}` },
            { status: 400 }
        )
    }

    const supabase = createAdminClient()

    // Search resolves to participant ids first. Filtering on an embedded
    // profile would make PostgREST inner-join and silently drop support
    // threads, which have a null student_id or mentor_id.
    let matchedProfileIds: string[] | null = null
    if (q) {
        const pattern = `%${escapeForOr(q)}%`
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
            .limit(500)

        if (profileError) {
            console.error('[service/messages] profile search failed:', profileError.message)
            return NextResponse.json({ error: 'Search failed' }, { status: 500 })
        }

        matchedProfileIds = (profiles ?? []).map((p) => p.id)
        // No participant matched, so no conversation can. Return early rather
        // than building an `in.()` with an empty list, which PostgREST rejects.
        if (matchedProfileIds.length === 0) {
            return NextResponse.json(
                { conversations: [], total: 0, limit, offset, has_more: false },
                { headers: { 'Cache-Control': 'no-store' } }
            )
        }
    }

    let query = supabase
        .from('conversations')
        .select(
            `
            id,
            student_id,
            mentor_id,
            type,
            last_message_at,
            created_at,
            student:profiles!conversations_student_id_fkey ( id, full_name, email ),
            mentor:profiles!conversations_mentor_id_fkey ( id, full_name, email )
            `,
            { count: 'exact' }
        )

    if (rawType) query = query.eq('type', rawType)
    if (matchedProfileIds) {
        const list = `(${matchedProfileIds.join(',')})`
        const { data: memberRows } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .in('user_id', matchedProfileIds)
        const groupIds = [...new Set((memberRows ?? []).map((row) => row.conversation_id))]
        const clauses = [`student_id.in.${list}`, `mentor_id.in.${list}`]
        if (groupIds.length > 0) {
            clauses.push(`id.in.(${groupIds.join(',')})`)
        }
        query = query.or(clauses.join(','))
    }

    // Explicit .range() rather than relying on PostgREST's default max-rows.
    // A bare .select() silently caps at the server's limit and still returns
    // 200, which looks healthy while hiding conversations.
    const { data, error, count } = await query
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) {
        console.error('[service/messages] conversation list failed:', error.message)
        return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
    }

    const rows = data ?? []
    const groupIds = rows
        .filter((row) => (row as { type?: string }).type === 'group')
        .map((row) => (row as { id: string }).id)
    const membersByConversation = await loadGroupMembers(supabase, groupIds)

    // Per-conversation message count and last message, for this page only.
    // Bounded by `limit` (max 200), so this never fans out with the table.
    const enriched = await Promise.all(
        rows.map(async (row: Record<string, unknown>) => {
            const id = row.id as string

            const [{ count: messageCount }, { data: lastRows }] = await Promise.all([
                supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', id),
                supabase
                    .from('messages')
                    .select('content, sender_id, created_at, attachments')
                    .eq('conversation_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1),
            ])

            const last = lastRows?.[0] ?? null
            const student = row.student as Record<string, unknown> | null
            const mentor = row.mentor as Record<string, unknown> | null
            const type = (row.type as ConversationType) ?? 'mentor'
            const participants =
                type === 'group'
                    ? crmParticipants(membersByConversation.get(id) || [])
                    : undefined

            return {
                id,
                type,
                student_id: row.student_id ?? null,
                mentor_id: row.mentor_id ?? null,
                student: student
                    ? { id: student.id, full_name: student.full_name, email: student.email }
                    : null,
                mentor: mentor
                    ? { id: mentor.id, full_name: mentor.full_name, email: mentor.email }
                    : null,
                participants,
                message_count: messageCount ?? 0,
                created_at: row.created_at,
                last_message_at: row.last_message_at ?? row.created_at,
                last_message: last
                    ? {
                          // Truncated server-side so a long message never
                          // bloats the index response.
                          preview: String(last.content ?? '').slice(0, PREVIEW_CHARS),
                          sender_id: last.sender_id,
                          created_at: last.created_at,
                          attachments: last.attachments ?? null,
                      }
                    : null,
            }
        })
    )

    const total = count ?? enriched.length

    return NextResponse.json(
        {
            conversations: enriched,
            total,
            limit,
            offset,
            has_more: offset + enriched.length < total,
        },
        { headers: { 'Cache-Control': 'no-store' } }
    )
}
