'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { createClient } from '@/utils/supabase/client'

/**
 * Unread message count for the current user, kept fresh via realtime inserts
 * plus a 60s poll as a safety net. Returns 0 for roles without conversations.
 *
 * The sidebar and the mobile tab bar are both mounted at once (each is hidden
 * at the other's breakpoint), so the subscription is shared and reference
 * counted rather than created per component: `createBrowserClient` memoizes the
 * client, and calling `.channel(name)` twice with the same name returns the
 * already-subscribed channel, which then rejects further `.on()` handlers.
 */

interface Entry {
    count: number
    listeners: Set<() => void>
    refs: number
    teardown?: () => void
}

const entries = new Map<string, Entry>()

// Channel names are never reused. A quick unmount/remount (React StrictMode in
// dev does exactly this) would otherwise race `removeChannel` against the next
// `channel()` call and hit the same "after subscribe()" error.
let channelSeq = 0

function emit(entry: Entry, count: number) {
    if (entry.count === count) return
    entry.count = count
    entry.listeners.forEach((l) => l())
}

function start(key: string, entry: Entry, userId: string, role: string) {
    const supabase = createClient()
    let active = true

    const fetchUnreadCount = async () => {
        if (!active) return
        try {
            // 1) Get all conversations for this user (as student or mentor)
            const { data: conversations } = await supabase
                .from('conversations')
                .select('id')
                .eq(role === 'student' ? 'student_id' : 'mentor_id', userId)
                .neq('type', 'group')

            const { data: memberships } = await supabase
                .from('conversation_participants')
                .select('conversation_id, last_read_at')
                .eq('user_id', userId)

            const pairIds = (conversations || []).map((c) => c.id)
            const groupRows = memberships || []

            let total = 0

            if (pairIds.length > 0) {
                const { count } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .in('conversation_id', pairIds)
                    .eq('is_read', false)
                    .neq('sender_id', userId)
                total += count || 0
            }

            for (const row of groupRows) {
                let query = supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', row.conversation_id)
                    .neq('sender_id', userId)
                if (row.last_read_at) {
                    query = query.gt('created_at', row.last_read_at)
                }
                const { count } = await query
                total += count || 0
            }

            if (active) emit(entry, total)
        } catch (err) {
            console.error('[useUnreadMessages] Failed to fetch unread messages count:', err)
        }
    }

    fetchUnreadCount()

    // Re-fetch when new messages arrive via realtime
    const channel = supabase
        .channel(`messages-unread-${++channelSeq}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            () => {
                fetchUnreadCount()
            }
        )
        .subscribe()

    // Light polling as a safety net (every 60s)
    const interval = setInterval(fetchUnreadCount, 60_000)

    entry.teardown = () => {
        active = false
        clearInterval(interval)
        supabase.removeChannel(channel)
    }
}

export function useUnreadMessages(userId: string | undefined, role: string) {
    const enabled = Boolean(userId) && (role === 'student' || role === 'mentor')
    const key = enabled ? `${userId}:${role}` : ''

    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            if (!enabled) return () => { }

            let entry = entries.get(key)
            if (!entry) {
                entry = { count: 0, listeners: new Set(), refs: 0 }
                entries.set(key, entry)
            }
            entry.listeners.add(onStoreChange)
            entry.refs += 1
            if (entry.refs === 1) start(key, entry, userId!, role)

            return () => {
                const current = entries.get(key)
                if (!current) return
                current.listeners.delete(onStoreChange)
                current.refs -= 1
                if (current.refs === 0) {
                    current.teardown?.()
                    entries.delete(key)
                }
            }
        },
        [enabled, key, userId, role]
    )

    const getSnapshot = useCallback(() => (key ? entries.get(key)?.count ?? 0 : 0), [key])

    // The server never has a count; render 0 until the client subscribes.
    return useSyncExternalStore(subscribe, getSnapshot, () => 0)
}
