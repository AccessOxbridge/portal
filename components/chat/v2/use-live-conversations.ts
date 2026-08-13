'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

/**
 * Keeps the conversation list fresh without a page refresh.
 *
 * The list is rendered by a server component and handed down as props, so
 * until now nothing ever refetched it: a new message updated the open thread
 * (ChatWindow has its own subscription) but the sidebar kept showing a stale
 * preview, a stale timestamp and a stale unread count until you reloaded.
 *
 * This subscribes to message INSERTs and patches the matching row in place.
 * No database change is involved — `messages` is already in the
 * supabase_realtime publication, and RLS means a client is only told about
 * messages it is allowed to read.
 *
 * Not covered, because both need migrations we are deliberately not making:
 * a brand-new conversation appearing (`conversations` is not in the
 * publication) and read receipts flipping live (UPDATE events need
 * REPLICA IDENTITY FULL on an RLS table).
 */

/** The minimum a conversation must expose for this hook to maintain it. */
export interface LiveConversation {
    id: string
    type?: string
    last_message_at: string
    last_message?: {
        content: string
        sender_id: string
        attachments?: unknown
    } | null
    unread_count?: number
}

// Channel names are never reused. A quick unmount/remount (React StrictMode
// does exactly this in dev) would otherwise race removeChannel against the
// next channel() call for the same name.
let channelSeq = 0

/**
 * Most recent first, optionally with support threads pinned above the rest.
 *
 * Pinning is right for a participant's own list — a student or mentor has a
 * single support thread and always wants it reachable — but wrong for the
 * admin overview, where support threads are the majority and pinning them
 * pushes every recently active mentor thread below a pile of stale (often
 * empty) ones. Hence `pinSupport`, rather than the pin being unconditional.
 */
function sortConversations<T extends LiveConversation>(list: T[], pinSupport: boolean): T[] {
    const rank = (c: T) =>
        pinSupport && (c.type === 'support' || c.type === 'mentor_support') ? 0 : 1

    return [...list].sort((a, b) => {
        const byType = rank(a) - rank(b)
        if (byType !== 0) return byType
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    })
}

export function useLiveConversations<T extends LiveConversation>(
    initial: T[],
    currentUserId: string,
    /** The open conversation never accrues unread — ChatWindow marks it read. */
    selectedId: string | null,
    /**
     * Called when a message arrives for a conversation this list has never
     * seen. Pass `router.refresh` — the server re-renders the list with the
     * participant names and photos already joined, and the merge effect below
     * folds the new row in without discarding live state. Doing it this way
     * avoids both a database change and a per-surface fetcher, since each page
     * shapes `other_user` differently.
     */
    onUnknownConversation?: () => void,
    /**
     * Keep support threads at the top. Defaults to the participant-side
     * behaviour; the admin overview passes false so the list is pure recency.
     */
    pinSupport = true
) {
    const [conversations, setConversations] = useState<T[]>(() =>
        sortConversations(initial, pinSupport)
    )

    const pinSupportRef = useRef(pinSupport)
    useEffect(() => {
        pinSupportRef.current = pinSupport
    }, [pinSupport])

    // Read inside the subscription callback, which is created once.
    const selectedIdRef = useRef(selectedId)
    useEffect(() => {
        selectedIdRef.current = selectedId
    }, [selectedId])

    const onUnknownRef = useRef(onUnknownConversation)
    useEffect(() => {
        onUnknownRef.current = onUnknownConversation
    }, [onUnknownConversation])

    // Guards against a burst of messages in an unseen conversation firing a
    // refresh per message.
    const refreshPendingRef = useRef(false)
    useEffect(() => {
        refreshPendingRef.current = false
    }, [initial])

    // Merge in conversations the server knows about that we don't yet, without
    // clobbering rows the subscription has already updated.
    useEffect(() => {
        setConversations((prev) => {
            const known = new Set(prev.map((c) => c.id))
            const added = initial.filter((c) => !known.has(c.id))
            if (added.length === 0) return prev
            return sortConversations([...prev, ...added], pinSupportRef.current)
        })
    }, [initial])

    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel(`conversation-list-${++channelSeq}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const message = payload.new as {
                        conversation_id: string
                        sender_id: string
                        content: string
                        attachments?: unknown
                        created_at?: string | null
                    }

                    setConversations((prev) => {
                        const index = prev.findIndex((c) => c.id === message.conversation_id)

                        // A thread started since this page loaded. We have no row
                        // to patch and cannot invent the participants, so ask the
                        // server for a fresh list; the merge effect adds it.
                        if (index === -1) {
                            if (!refreshPendingRef.current) {
                                refreshPendingRef.current = true
                                onUnknownRef.current?.()
                            }
                            return prev
                        }

                        const conversation = prev[index]
                        const isMine = message.sender_id === currentUserId
                        const isOpen = selectedIdRef.current === conversation.id
                        const current = conversation.unread_count ?? 0

                        const next = [...prev]
                        next[index] = {
                            ...conversation,
                            last_message_at: message.created_at ?? new Date().toISOString(),
                            last_message: {
                                content: message.content,
                                sender_id: message.sender_id,
                                attachments: message.attachments,
                            },
                            unread_count: isMine || isOpen ? current : current + 1,
                        }

                        return sortConversations(next, pinSupportRef.current)
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUserId])

    /** Clear the unread pill when a conversation is opened. */
    const markRead = useCallback((conversationId: string) => {
        setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
        )
    }, [])

    return { conversations, markRead }
}
