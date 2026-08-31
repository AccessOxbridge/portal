/**
 * Helpers for admin-created group conversations (`type = 'group'`).
 *
 * 1:1 threads (mentor / support / mentor_support) do not use this module.
 */

export type ChatGroupMember = {
    user_id: string
    role: 'student' | 'mentor' | 'admin'
    last_read_at: string | null
    full_name: string | null
    email: string | null
    photo_url: string | null
}

export function isGroupType(type: string | null | undefined): boolean {
    return type === 'group'
}

/** Sorted unique ids — the uniqueness key stored on conversations.participant_set_key. */
export function participantSetKey(userIds: string[]): string {
    return [...new Set(userIds)].sort().join(',')
}

export function firstNameOf(fullName: string | null | undefined, fallback = 'there'): string {
    const first = (fullName || '').trim().split(/\s+/)[0]
    return first || fallback
}

function displayName(member: ChatGroupMember): string {
    const name = (member.full_name || '').trim()
    return name || (member.role === 'student' ? 'Student' : 'Mentor')
}

export function formatGroupTitle(
    members: ChatGroupMember[],
    currentUserId?: string
): string {
    const others = members.filter(
        (m) => m.role !== 'admin' && m.user_id !== currentUserId
    )
    const names = others.map(displayName)
    if (names.length === 0) return 'Group chat'
    return names.join(', ')
}

export function groupIntroBody(members: ChatGroupMember[]): string {
    const student = members.find((m) => m.role === 'student')
    const studentFirst = firstNameOf(student?.full_name, 'the student')
    return [
        'Hi everyone,',
        `Given that ${studentFirst} has more than one mentor on his programme, this group chat is a shared space for you to coordinate together. Please use it to get everyone up to date on session progression, share anything useful ahead of meetings, and keep in touch. You should still use your individual chats with one another for regular communication, however this should be used for information that would be useful for all parties to know! I'll be here in the background should anything come up that needs input from the team.`,
        '',
        'Claire',
    ].join('\n')
}

type ProfileEmbed = {
    id?: string
    full_name?: string | null
    email?: string | null
    photo_url?: string | null
} | null

function oneProfile(value: ProfileEmbed | ProfileEmbed[]): ProfileEmbed {
    if (Array.isArray(value)) return value[0] ?? null
    return value
}

type ParticipantRow = {
    conversation_id: string
    user_id: string
    role: string
    last_read_at: string | null
    profile?: ProfileEmbed | ProfileEmbed[]
}

/**
 * Load members for a set of group conversations, overlaying mentor photos
 * from the `mentors` table (profile.photo_url is often empty for mentors).
 */
export async function loadGroupMembers(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: { from: (table: string) => any },
    conversationIds: string[]
): Promise<Map<string, ChatGroupMember[]>> {
    const byConversation = new Map<string, ChatGroupMember[]>()
    if (conversationIds.length === 0) return byConversation

    const { data: rows } = await supabase
        .from('conversation_participants')
        .select(`
            conversation_id,
            user_id,
            role,
            last_read_at,
            profile:profiles!conversation_participants_user_id_fkey (
                id,
                full_name,
                email,
                photo_url
            )
        `)
        .in('conversation_id', conversationIds)

    const participants = (rows || []) as ParticipantRow[]
    const mentorIds = [
        ...new Set(
            participants
                .filter((p) => p.role === 'mentor')
                .map((p) => p.user_id)
        ),
    ]

    const photoMap = new Map<string, string | null>()
    if (mentorIds.length > 0) {
        const { data: mentorRows } = await supabase
            .from('mentors')
            .select('id, photo_url')
            .in('id', mentorIds)
        for (const mentor of (mentorRows || []) as { id: string; photo_url: string | null }[]) {
            photoMap.set(mentor.id, mentor.photo_url)
        }
    }

    for (const row of participants) {
        const profile = oneProfile(row.profile ?? null)
        const role = row.role as ChatGroupMember['role']
        const member: ChatGroupMember = {
            user_id: row.user_id,
            role,
            last_read_at: row.last_read_at,
            full_name: profile?.full_name ?? null,
            email: profile?.email ?? null,
            photo_url:
                role === 'admin'
                    ? '/logo.png'
                    : role === 'mentor'
                      ? photoMap.get(row.user_id) || profile?.photo_url || null
                      : profile?.photo_url || null,
        }
        const list = byConversation.get(row.conversation_id) || []
        list.push(member)
        byConversation.set(row.conversation_id, list)
    }

    return byConversation
}

export function groupListPreview(
    members: ChatGroupMember[],
    currentUserId?: string
): { title: string; photoUrl: string | null; avatars: ChatGroupMember[] } {
    const others = members.filter(
        (m) => m.role !== 'admin' && m.user_id !== currentUserId
    )
    return {
        title: formatGroupTitle(members, currentUserId),
        photoUrl: others[0]?.photo_url ?? '/logo.png',
        avatars: others.slice(0, 2),
    }
}

export function toGroupSummary(
    conv: {
        id: string
        student_id: string | null
        admin_id?: string | null
        mentor_id: string | null
        last_message_at: string | null
    },
    members: ChatGroupMember[],
    currentUserId: string,
    lastMessage: { content: string; sender_id: string; attachments?: unknown } | null,
    unreadCount: number
) {
    const preview = groupListPreview(members, currentUserId)
    return {
        id: conv.id,
        student_id: conv.student_id,
        mentor_id: conv.mentor_id,
        admin_id: conv.admin_id ?? null,
        type: 'group' as const,
        last_message_at: conv.last_message_at || new Date().toISOString(),
        other_user: {
            id: preview.avatars[0]?.user_id || 'group',
            full_name: preview.title,
            photo_url: preview.photoUrl,
            role_label: 'Group chat',
        },
        admin_user: { id: conv.admin_id || currentUserId, full_name: 'Senior Strategist' },
        members,
        last_message: lastMessage,
        unread_count: unreadCount,
    }
}

export async function countUnreadSince(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: { from: (table: string) => any },
    conversationId: string,
    userId: string,
    lastReadAt: string | null
): Promise<number> {
    let query = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)

    if (lastReadAt) {
        query = query.gt('created_at', lastReadAt)
    }

    const { count } = await query
    return count || 0
}
