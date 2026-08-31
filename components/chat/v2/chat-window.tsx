'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { isSameDay } from 'date-fns'
import { ChevronLeft, MessageSquare, ArrowDown } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import MessageBubble, { type MessageStatus } from './message-bubble'
import MessageInput from './message-input'
import InterventionBubble from './intervention-bubble'
import DateSeparator from './date-separator'
import ImageLightbox from './image-lightbox'
import {
    signAttachmentUrls,
    toChatAttachments,
    uploadAttachment,
    type ChatAttachment,
    type PendingAttachment,
} from '@/lib/chat-attachments'
import { formatGroupTitle, type ChatGroupMember } from '@/lib/chat-groups'
import { cn } from '@/utils/lib'

interface Message {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    attachments: ChatAttachment[] | null
    is_read: boolean | null
    created_at: string | null
    /** Client-side only; absent on rows loaded from the database. */
    status?: MessageStatus
}

interface ChatWindowProps {
    conversationId: string
    currentUserId: string
    otherUser: {
        id: string
        full_name: string | null
        photo_url?: string | null
        role_label?: string | null
    }
    adminUser?: { id: string; full_name: string }
    allParticipants?: {
        student_id?: string | null
        mentor_id: string | null
        admin_id?: string
    }
    members?: ChatGroupMember[]
    isGroup?: boolean
    onBack?: () => void
}

export default function ChatWindow({
    conversationId,
    currentUserId,
    otherUser,
    adminUser,
    allParticipants,
    members,
    isGroup = false,
    onBack,
}: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isOtherUserOnline, setIsOtherUserOnline] = useState(false)
    const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map())
    const [lightbox, setLightbox] = useState<ChatAttachment | null>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()
    const groupOthers = (members || []).filter(
        (m) => m.role !== 'admin' && m.user_id !== currentUserId
    )

    // Drives the jump-to-latest button, and decides whether an arriving message
    // is allowed to move the view at all.
    const [isAtBottom, setIsAtBottom] = useState(true)

    // Files for messages that failed to send, kept so Retry can re-upload
    // without asking the user to pick them again.
    const failedPayloads = useRef<Map<string, { content: string; attachments: PendingAttachment[] }>>(new Map())

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior })
    }, [])

    /**
     * "Near" rather than exactly at the bottom: a fractional scroll height, an
     * image finishing its load, or a browser's own rounding all leave a couple
     * of pixels behind, and none of them mean the reader has scrolled away.
     */
    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
    }, [])

    /** Sign any attachment paths we don't already have a URL for. */
    const ensureSignedUrls = useCallback(
        async (items: Message[]) => {
            const paths = items
                .flatMap((m) => m.attachments || [])
                .map((a) => a.path)
                .filter((path) => !signedUrls.has(path))

            if (paths.length === 0) return

            const fresh = await signAttachmentUrls(supabase, [...new Set(paths)])
            if (fresh.size > 0) {
                setSignedUrls((current) => new Map([...current, ...fresh]))
            }
        },
        [signedUrls, supabase]
    )

    const isInterventionMessage = (message: Message) => {
        if (message.content.startsWith('[ADMIN] ')) return true
        if (isGroup) {
            const sender = members?.find((m) => m.user_id === message.sender_id)
            return sender?.role === 'admin' || !sender
        }
        if (!allParticipants?.mentor_id || !allParticipants?.student_id) return false
        return (
            message.sender_id !== allParticipants.student_id &&
            message.sender_id !== allParticipants.mentor_id
        )
    }

    const markGroupRead = useCallback(() => {
        if (!isGroup) return
        supabase
            .from('conversation_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', currentUserId)
            .then()
    }, [isGroup, supabase, conversationId, currentUserId])

    const senderFor = (senderId: string) => {
        if (!isGroup) {
            return { name: otherUser.full_name || 'User', photo: otherUser.photo_url }
        }
        const member = members?.find((m) => m.user_id === senderId)
        if (!member || member.role === 'admin') {
            return { name: 'Claire Marlowe', photo: '/logo.png' }
        }
        return {
            name: member.full_name || (member.role === 'student' ? 'Student' : 'Mentor'),
            photo: member.photo_url,
        }
    }

    // Presence
    useEffect(() => {
        const presenceChannel = supabase.channel(`presence:${conversationId}`)

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState()
                setIsOtherUserOnline(
                    Object.values(state).some((presences: any) =>
                        presences.some((p: any) => p.user_id === otherUser.id)
                    )
                )
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                if (newPresences.some((p: any) => p.user_id === otherUser.id)) setIsOtherUserOnline(true)
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                if (leftPresences.some((p: any) => p.user_id === otherUser.id)) setIsOtherUserOnline(false)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: currentUserId, online_at: new Date().toISOString() })
                }
            })

        return () => {
            supabase.removeChannel(presenceChannel)
        }
    }, [conversationId, currentUserId, otherUser.id])

    // Load thread
    useEffect(() => {
        let cancelled = false

        const fetchMessages = async () => {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })

            if (cancelled) return

            if (!error && data) {
                const rows: Message[] = (data as any[]).map((row) => ({
                    ...row,
                    attachments: toChatAttachments(row.attachments),
                }))
                setMessages(rows)
                ensureSignedUrls(rows)
            }
            setIsLoading(false)
        }

        fetchMessages()

        if (isGroup) {
            markGroupRead()
        } else {
            supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', currentUserId)
                .eq('is_read', false)
                .then()
        }

        return () => {
            cancelled = true
        }
        // ensureSignedUrls intentionally omitted: it changes identity whenever a
        // URL is cached, which would re-run the fetch on every signed batch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, currentUserId, isGroup])

    // Realtime inserts
    useEffect(() => {
        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const raw = payload.new as any
                    const incoming: Message = {
                        ...raw,
                        attachments: toChatAttachments(raw.attachments),
                    }

                    // Our own sends are already on screen optimistically.
                    if (incoming.sender_id === currentUserId) return

                    setMessages((prev) =>
                        prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
                    )
                    ensureSignedUrls([incoming])

                    if (isGroup) {
                        markGroupRead()
                    } else {
                        supabase.from('messages').update({ is_read: true }).eq('id', incoming.id).then()
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    // Read receipts. Only reaches us because messages carries
                    // REPLICA IDENTITY FULL — Realtime needs the whole old row
                    // to evaluate RLS on UPDATE events, and drops them without it.
                    const updated = payload.new as { id: string; is_read: boolean | null }
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === updated.id ? { ...m, is_read: updated.is_read } : m
                        )
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, currentUserId])

    // Following the conversation keeps you pinned to the newest message; having
    // scrolled up to read something does not, because yanking the view back
    // down mid-sentence is the worst thing a chat pane can do. The button
    // below is how you get back.
    useEffect(() => {
        if (isAtBottom) scrollToBottom()
        // `isAtBottom` is deliberately not a dependency — this should fire when
        // messages arrive, not when the reader's scroll position changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, scrollToBottom])

    const deliver = useCallback(
        async (messageId: string, content: string, attachments: PendingAttachment[]) => {
            // Uploads land under <conversation>/<message>/ which is exactly what
            // the bucket policy checks, so the id has to exist before upload.
            const uploaded: ChatAttachment[] = []
            for (const item of attachments) {
                uploaded.push(
                    await uploadAttachment(supabase, {
                        conversationId,
                        messageId,
                        file: item.file,
                        kind: item.kind,
                        width: item.width,
                        height: item.height,
                    })
                )
            }

            const { data, error } = await supabase
                .from('messages')
                // Cast: attachments is generated as `Json`, and TypeScript will
                // not assign an interface array to Json's index-signature type
                // without one. The shape is guaranteed by uploadAttachment.
                .insert({
                    id: messageId,
                    conversation_id: conversationId,
                    sender_id: currentUserId,
                    content,
                    ...(uploaded.length > 0 ? { attachments: uploaded } : {}),
                } as never)
                .select()
                .single()

            if (error) throw error

            await supabase
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', conversationId)

            fetch('/api/messages/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId }),
            }).catch(() => { })

            return data as unknown as Message
        },
        [conversationId, currentUserId, supabase]
    )

    const handleSend = async (content: string, attachments: PendingAttachment[]) => {
        const messageId = crypto.randomUUID()

        const optimistic: Message = {
            id: messageId,
            conversation_id: conversationId,
            sender_id: currentUserId,
            content,
            attachments: attachments.map((a) => ({
                path: `pending:${a.id}`,
                name: a.file.name,
                mime: a.file.type,
                size: a.file.size,
                kind: a.kind,
                width: a.width,
                height: a.height,
            })),
            is_read: false,
            created_at: new Date().toISOString(),
            status: 'sending',
        }

        // Show local previews immediately rather than waiting on upload+sign.
        if (attachments.length > 0) {
            setSignedUrls((current) => {
                const next = new Map(current)
                attachments.forEach((a) => a.previewUrl && next.set(`pending:${a.id}`, a.previewUrl))
                return next
            })
        }

        setMessages((prev) => [...prev, optimistic])
        // Sending is an explicit act of joining the end of the conversation.
        setIsAtBottom(true)
        scrollToBottom()

        try {
            const saved = await deliver(messageId, content, attachments)
            failedPayloads.current.delete(messageId)
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...saved, status: 'sent' } : m)))
            if (saved.attachments?.length) ensureSignedUrls([saved])
        } catch (err) {
            // Keep the message on screen in a failed state — never silently drop
            // what someone wrote.
            failedPayloads.current.set(messageId, { content, attachments })
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'failed' } : m)))
            throw err
        }
    }

    const handleRetry = async (messageId: string) => {
        const payload = failedPayloads.current.get(messageId)
        if (!payload) return

        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'sending' } : m)))

        try {
            const saved = await deliver(messageId, payload.content, payload.attachments)
            failedPayloads.current.delete(messageId)
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...saved, status: 'sent' } : m)))
            if (saved.attachments?.length) ensureSignedUrls([saved])
        } catch {
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'failed' } : m)))
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">Loading messages…</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header. Full pane width, like the thread below it. */}
            <div className="shrink-0 border-b border-gray-200/70 bg-white px-4 md:px-6 py-3">
                <div className="flex items-center gap-3">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to conversations"
                        className="md:hidden -ml-1 shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-600 active:bg-gray-100 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}

                <div className="relative shrink-0">
                    {isGroup ? (
                        <div className="relative w-10 h-10">
                            {groupOthers.slice(0, 2).map((member, index) => (
                                <div
                                    key={member.user_id}
                                    className={`absolute w-6 h-6 rounded-full overflow-hidden ring-2 ring-white ${
                                        index === 0 ? 'left-0 top-0 z-10' : 'right-0 bottom-0'
                                    }`}
                                >
                                    {member.photo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={member.photo_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-accent flex items-center justify-center text-white text-[10px] font-semibold">
                                            {member.full_name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : otherUser.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={otherUser.photo_url}
                            alt={otherUser.full_name || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold">
                            {otherUser.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                    {!isGroup && isOtherUserOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className={cn('font-semibold text-gray-900', isGroup ? 'leading-snug' : 'truncate')}>
                        {isGroup
                            ? formatGroupTitle(members || [], currentUserId)
                            : otherUser.full_name || 'Mentor'}
                    </h3>
                    {isGroup || adminUser ? (
                        <p className="text-xs text-gray-400">Group chat · Access Oxbridge team</p>
                    ) : otherUser.role_label ? (
                        <p className="text-xs font-medium text-accent">{otherUser.role_label}</p>
                    ) : (
                        <p className={`text-xs ${isOtherUserOnline ? 'text-green-500' : 'text-gray-400'}`}>
                            {isOtherUserOnline ? 'Online' : 'Offline'}
                        </p>
                    )}
                </div>
                </div>
            </div>

            {/* Thread runs the full width of the pane — no centred column.
                The scroller is wrapped so the jump-to-latest button can sit over
                it; inside, it would scroll along with the messages. */}
            <div className="relative flex-1 min-h-0">
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto px-4 md:px-6 py-4 bg-[#FAFBFC]"
            >
              <div className="w-full h-full">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <MessageSquare className="w-12 h-12 mb-3 text-gray-200" strokeWidth={1.5} />
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="text-xs text-gray-300 mt-1">Say hello to start the conversation.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        {messages.map((message, index) => {
                            const previous = index > 0 ? messages[index - 1] : null
                            const next = index < messages.length - 1 ? messages[index + 1] : null

                            const timestamp = message.created_at || new Date().toISOString()
                            const showDate =
                                !previous ||
                                !isSameDay(new Date(previous.created_at || timestamp), new Date(timestamp))

                            // A day break also breaks the run, so the sender is
                            // re-introduced with avatar and name after a separator.
                            const isFirstInGroup =
                                showDate || !previous || previous.sender_id !== message.sender_id
                            const isLastInGroup = !next || next.sender_id !== message.sender_id

                            const separator = showDate ? (
                                <DateSeparator key={`sep-${message.id}`} timestamp={timestamp} />
                            ) : null

                            const spacing = cnGroupSpacing(isFirstInGroup, showDate)

                            if (isInterventionMessage(message)) {
                                return (
                                    <div key={message.id} className="contents">
                                        {separator}
                                        <div className={spacing}>
                                            <InterventionBubble
                                                content={message.content.replace(/^\[ADMIN\]\s*/, '')}
                                                timestamp={timestamp}
                                                attachments={message.attachments}
                                                signedUrls={signedUrls}
                                                onOpenImage={setLightbox}
                                                isFirstInGroup={isFirstInGroup}
                                            />
                                        </div>
                                    </div>
                                )
                            }

                            const isSent = message.sender_id === currentUserId
                            const sender = senderFor(message.sender_id)

                            return (
                                <div key={message.id} className="contents">
                                    {separator}
                                    <div className={spacing}>
                                        <MessageBubble
                                            content={message.content}
                                            attachments={message.attachments}
                                            isSent={isSent}
                                            timestamp={timestamp}
                                            isRead={isGroup ? false : message.is_read ?? false}
                                            senderName={isSent ? undefined : sender.name}
                                            avatarUrl={sender.photo}
                                            isFirstInGroup={isFirstInGroup}
                                            isLastInGroup={isLastInGroup}
                                            status={message.status}
                                            signedUrls={signedUrls}
                                            onOpenImage={setLightbox}
                                            onRetry={() => handleRetry(message.id)}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
              </div>
            </div>

            {!isAtBottom && (
                <button
                    type="button"
                    onClick={() => scrollToBottom()}
                    aria-label="Jump to latest message"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-accent hover:border-accent/30 transition-colors"
                >
                    <ArrowDown className="w-4 h-4" />
                </button>
            )}
            </div>

            <MessageInput onSend={handleSend} />

            {lightbox && (
                <ImageLightbox
                    attachment={lightbox}
                    url={signedUrls.get(lightbox.path)}
                    onClose={() => setLightbox(null)}
                />
            )}
        </div>
    )
}

/**
 * Runs from one sender sit tight together; a new speaker gets clear air. This
 * is what makes an unbubbled thread scan — the whitespace does the grouping
 * work the bubble outlines used to.
 */
function cnGroupSpacing(isFirstInGroup: boolean, showDate: boolean) {
    if (showDate) return 'mt-2'
    return isFirstInGroup ? 'mt-4' : undefined
}
