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
 * Support threads stay pinned above mentor threads, then most recent first.
 * This matches the order the student page already applies server-side, so the
 * list does not reshuffle the moment the subscription takes over.
 */
function sortConversations<T extends LiveConversation>(list: T[]): T[] {
    const rank = (c: T) => (c.type === 'support' || c.type === 'mentor_support' ? 0 : 1)

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
    selectedId: string | null
) {
    const [conversations, setConversations] = useState<T[]>(() => sortConversations(initial))

    // Read inside the subscription callback, which is created once.
    const selectedIdRef = useRef(selectedId)
    useEffect(() => {
        selectedIdRef.current = selectedId
    }, [selectedId])

    // Merge in conversations the server knows about that we don't yet, without
    // clobbering rows the subscription has already updated.
    useEffect(() => {
        setConversations((prev) => {
            const known = new Set(prev.map((c) => c.id))
            const added = initial.filter((c) => !known.has(c.id))
            if (added.length === 0) return prev
            return sortConversations([...prev, ...added])
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
                        // A message for a conversation not in this list (e.g. one
                        // created since the page loaded) is ignored: we have no
                        // row to attach it to and cannot invent the participants.
                        if (index === -1) return prev

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

                        return sortConversations(next)
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
