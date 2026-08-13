'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format, isSameDay } from 'date-fns'
import { Search, MessageCircle, Users, X, AlertTriangle, ArrowDown } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/utils/lib'
import CollapsibleText from '@/components/chat/v2/collapsible-text'
import { stripFormatting } from '@/lib/chat-format'
import AttachmentGrid from '@/components/chat/v2/attachment-grid'
import DateSeparator from '@/components/chat/v2/date-separator'
import ImageLightbox from '@/components/chat/v2/image-lightbox'
import MessageInput from '@/components/chat/v2/message-input'
import { useLiveConversations } from '@/components/chat/v2/use-live-conversations'
import {
    signAttachmentUrls,
    uploadAttachment,
    attachmentPreviewLabel,
    toChatAttachments,
    type ChatAttachment,
    type PendingAttachment,
} from '@/lib/chat-attachments'

/**
 * Admin view of every conversation. Deliberately not built on v2's ChatWindow:
 * that component models a two-party thread with an "other user", whereas an
 * admin is a third party watching a student↔mentor exchange and needs each
 * message attributed by name and role. The presentation pieces (bubble
 * internals, attachments, separators, composer) are shared.
 */

interface Message {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    attachments: ChatAttachment[] | null
    is_read: boolean
    created_at: string
}

interface Conversation {
    id: string
    student_id: string | null
    mentor_id: string | null
    type?: 'mentor' | 'support' | 'mentor_support'
    last_message_at: string
    created_at: string
    student: { id: string; full_name: string; email: string }
    mentor: { id: string; full_name: string; email: string }
    message_count: number
    last_message?: {
        content: string
        sender_id: string
        created_at: string
        /** Raw jsonb from the database; narrowed by toChatAttachments. */
        attachments?: unknown
    } | null
}

interface AdminMessagesContentProps {
    conversations: Conversation[]
    currentUserId: string
}

export default function AdminMessagesContent({
    conversations: initialConversations,
    currentUserId,
}: AdminMessagesContentProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

    // Same live list as the student and mentor views: previews, timestamps and
    // ordering update as messages land, with no refresh. Support threads are
    // not pinned here — they are most of what an admin sees, so pinning them
    // would bury the recently active mentor threads.
    const { conversations } = useLiveConversations(
        initialConversations,
        currentUserId,
        selectedConversation?.id ?? null,
        router.refresh,
        false
    )
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map())
    const [lightbox, setLightbox] = useState<ChatAttachment | null>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const supabase = createClient()

    const filteredConversations = conversations.filter((conv) => {
        const term = searchTerm.toLowerCase()
        return (
            (conv.student.full_name?.toLowerCase() || '').includes(term) ||
            (conv.mentor.full_name?.toLowerCase() || '').includes(term) ||
            (conv.student.email?.toLowerCase() || '').includes(term) ||
            (conv.mentor.email?.toLowerCase() || '').includes(term)
        )
    })

    const ensureSignedUrls = useCallback(
        async (items: Message[]) => {
            const paths = items
                .flatMap((m) => m.attachments || [])
                .map((a) => a.path)
                .filter((p) => !p.startsWith('pending:'))

            if (paths.length === 0) return
            const fresh = await signAttachmentUrls(supabase, [...new Set(paths)])
            if (fresh.size > 0) setSignedUrls((current) => new Map([...current, ...fresh]))
        },
        [supabase]
    )

    useEffect(() => {
        if (!selectedConversation) return

        const loadMessages = async () => {
            setIsLoadingMessages(true)
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', selectedConversation.id)
                .order('created_at', { ascending: true })

            if (!error && data) {
                const rows: Message[] = (data as any[]).map((m) => ({
                    ...m,
                    is_read: m.is_read || false,
                    created_at: m.created_at || new Date().toISOString(),
                    attachments: toChatAttachments(m.attachments),
                }))
                setMessages(rows)
                ensureSignedUrls(rows)
            }
            setIsLoadingMessages(false)
        }

        loadMessages()

        const channel = supabase
            .channel(`admin-messages:${selectedConversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${selectedConversation.id}`,
                },
                (payload) => {
                    const incoming = payload.new as any
                    const formatted: Message = {
                        ...incoming,
                        is_read: incoming.is_read || false,
                        created_at: incoming.created_at || new Date().toISOString(),
                        attachments: toChatAttachments(incoming.attachments),
                    }
                    setMessages((prev) =>
                        prev.some((m) => m.id === formatted.id) ? prev : [...prev, formatted]
                    )
                    ensureSignedUrls([formatted])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConversation])

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    /** "Near" the bottom — see the same guard in chat-window. */
    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
    }, [])

    // Only follow the thread when the reader is already at the end of it.
    useEffect(() => {
        if (isAtBottom) scrollToBottom()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, scrollToBottom])

    const isSupport = selectedConversation?.type === 'support'
    const isMentorSupport = selectedConversation?.type === 'mentor_support'
    // Direct threads (student↔help desk, admin↔mentor as "Claire") are a plain
    // 2-way chat; mentor↔student threads get a flagged "[ADMIN]" intervention.
    const isDirect = isSupport || isMentorSupport

    const handleSend = async (text: string, attachments: PendingAttachment[]) => {
        if (!selectedConversation) return

        const trimmed = text.trim()
        // Prefix preserved exactly: the student and mentor views key their
        // intervention styling off it.
        const content = isDirect || !trimmed ? trimmed : `[ADMIN] ${trimmed}`
        const messageId = crypto.randomUUID()

        const uploaded: ChatAttachment[] = []
        for (const item of attachments) {
            uploaded.push(
                await uploadAttachment(supabase, {
                    conversationId: selectedConversation.id,
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
            // Cast: attachments generates as `Json`; see chat-window.tsx.
            .insert({
                id: messageId,
                conversation_id: selectedConversation.id,
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
            .eq('id', selectedConversation.id)

        fetch('/api/messages/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: selectedConversation.id }),
        }).catch(() => { })

        const saved = data as any as Message
        setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]))
        ensureSignedUrls([saved])
    }

    const senderInfo = (senderId: string): { name: string; role: string } => {
        if (!selectedConversation) return { name: 'Unknown', role: '' }
        if (senderId === selectedConversation.student_id)
            return { name: selectedConversation.student.full_name || 'Student', role: 'student' }
        if (senderId === selectedConversation.mentor_id)
            return { name: selectedConversation.mentor.full_name || 'Mentor', role: 'mentor' }
        // Anyone who is neither participant is the Access Oxbridge team.
        return { name: 'Access Oxbridge', role: 'admin' }
    }

    return (
        // One surface split by a hairline, matching the student and mentor
        // threads — no floating cards.
        <div className="flex flex-1 min-h-0 bg-white border-t border-gray-200/70 overflow-hidden">
            {/* Conversations */}
            <div className="w-80 lg:w-96 shrink-0 border-r border-gray-200/70 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent/30"
                        />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {filteredConversations.length} conversation
                            {filteredConversations.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {conversations.reduce((sum, c) => sum + c.message_count, 0)} total
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                            <Users className="w-12 h-12 mb-3 text-gray-200" strokeWidth={1.5} />
                            <p className="text-sm">No conversations found</p>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => {
                            // Same as the student/mentor list: previews show the
                            // sentence, not the formatting markers around it.
                            const rawPreview = conv.last_message?.content?.replace(/^\[ADMIN\]\s*/, '')
                            const text = rawPreview ? stripFormatting(rawPreview) : ''
                            const preview =
                                text || attachmentPreviewLabel(conv.last_message?.attachments) || null

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={cn(
                                        'w-full p-4 text-left transition-colors hover:bg-gray-50 border-l-2',
                                        selectedConversation?.id === conv.id
                                            ? 'bg-accent/[0.06] border-accent'
                                            : 'border-transparent'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-gray-900 truncate">
                                                {conv.student.full_name}
                                            </p>
                                            <p
                                                className={cn(
                                                    'text-xs truncate',
                                                    conv.type === 'support'
                                                        ? 'text-amber-600 font-medium'
                                                        : 'text-gray-500'
                                                )}
                                            >
                                                ↔ {conv.type === 'support' ? 'Help & Support' : conv.mentor.full_name}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-[10px] text-gray-400">
                                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {preview && <p className="text-xs text-gray-400 truncate">{preview}</p>}
                                    <div className="mt-2">
                                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                            {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Thread */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {selectedConversation ? (
                    <>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">
                                    {selectedConversation.student.full_name} ↔{' '}
                                    {isSupport ? 'Help & Support' : selectedConversation.mentor.full_name}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {isSupport ? 'Help & Support request · ' : ''}
                                    Started {format(new Date(selectedConversation.created_at), 'MMM d, yyyy')}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedConversation(null)}
                                aria-label="Close conversation"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="relative flex-1 min-h-0">
                        <div
                            ref={scrollRef}
                            onScroll={handleScroll}
                            className="h-full overflow-y-auto px-4 md:px-6 py-4 bg-[#FAFBFC]"
                        >
                            {isLoadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <MessageCircle className="w-12 h-12 mb-3 text-gray-200" strokeWidth={1.5} />
                                    <p className="text-sm">No messages in this conversation</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {messages.map((message, index) => {
                                        const previous = index > 0 ? messages[index - 1] : null
                                        const showDate =
                                            !previous ||
                                            !isSameDay(new Date(previous.created_at), new Date(message.created_at))

                                        const { name, role } = senderInfo(message.sender_id)
                                        const isTeam = role === 'admin'
                                        // The team sits on the right in every thread;
                                        // in a mentor↔student thread its messages are
                                        // an intervention and marked as such.
                                        const alignRight = isTeam
                                        const isIntervention = isTeam && !isDirect
                                        const body = message.content.replace(/^\[ADMIN\]\s*/, '')

                                        return (
                                            <div key={message.id} className="contents">
                                                {showDate && <DateSeparator timestamp={message.created_at} />}

                                                <div
                                                    className={cn(
                                                        'flex flex-col max-w-[75%]',
                                                        alignRight ? 'self-end items-end' : 'self-start items-start'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1.5 mb-1 px-0.5">
                                                        <span
                                                            className={cn(
                                                                'text-[11px] font-semibold',
                                                                role === 'student'
                                                                    ? 'text-accent'
                                                                    : role === 'mentor'
                                                                        ? 'text-rich-green-accent'
                                                                        : 'text-amber-600'
                                                            )}
                                                        >
                                                            {isTeam && isDirect
                                                                ? isMentorSupport
                                                                    ? 'Claire Marlowe'
                                                                    : 'Help & Support'
                                                                : name}
                                                        </span>
                                                        {!isTeam && (
                                                            <span className="text-[10px] text-gray-400">({role})</span>
                                                        )}
                                                        {isIntervention && (
                                                            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                intervention
                                                            </span>
                                                        )}
                                                    </div>

                                                    {message.attachments && message.attachments.length > 0 && (
                                                        <div className="mb-1.5">
                                                            <AttachmentGrid
                                                                attachments={message.attachments}
                                                                signedUrls={signedUrls}
                                                                isSent={alignRight}
                                                                onOpenImage={setLightbox}
                                                            />
                                                        </div>
                                                    )}

                                                    {body.trim().length > 0 && (
                                                        // Same rule as the student/mentor thread:
                                                        // only the team's own messages get a bubble,
                                                        // participants' words render as plain prose.
                                                        <div
                                                            className={cn(
                                                                isIntervention
                                                                    ? 'px-3.5 py-2.5 rounded-2xl rounded-br-md bg-amber-50 border border-amber-200 text-amber-900'
                                                                    : alignRight
                                                                        ? 'px-3.5 py-2.5 rounded-2xl rounded-br-md bg-accent text-white'
                                                                        : 'text-gray-700'
                                                            )}
                                                        >
                                                            <CollapsibleText
                                                                content={body}
                                                                onDark={alignRight && !isIntervention}
                                                                fadeFrom={
                                                                    isIntervention
                                                                        ? 'from-amber-50'
                                                                        : alignRight
                                                                            ? 'from-accent'
                                                                            : 'from-[#FAFBFC]'
                                                                }
                                                            />
                                                        </div>
                                                    )}

                                                    <p className="text-[10px] text-gray-400 mt-1 px-0.5 tabular-nums">
                                                        {format(new Date(message.created_at), 'h:mm a')}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {!isAtBottom && (
                            <button
                                type="button"
                                onClick={scrollToBottom}
                                aria-label="Jump to latest message"
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-accent hover:border-accent/30 transition-colors"
                            >
                                <ArrowDown className="w-4 h-4" />
                            </button>
                        )}
                        </div>

                        <div className={isDirect ? 'bg-white' : 'bg-amber-50/60'}>
                            <div className="flex items-center gap-2 px-4 md:px-6 pt-3">
                                {isDirect ? (
                                    <>
                                        <MessageCircle className="w-4 h-4 text-accent" />
                                        <span className="text-xs font-medium text-accent">
                                            {isMentorSupport ? 'Reply as Claire Marlowe' : 'Reply as Help & Support'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        <span className="text-xs font-medium text-amber-700">
                                            Send as Access Oxbridge Support — both participants will see this
                                        </span>
                                    </>
                                )}
                            </div>
                            <MessageInput
                                onSend={handleSend}
                                placeholder={
                                    isMentorSupport
                                        ? 'Message the mentor…'
                                        : isSupport
                                            ? 'Reply to the student…'
                                            : 'Send a message as admin…'
                                }
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageCircle className="w-16 h-16 mb-4 text-gray-200" strokeWidth={1.5} />
                        <p className="text-lg font-medium">Select a conversation</p>
                        <p className="text-sm text-gray-300 mt-1">Choose a chat to view and monitor</p>
                    </div>
                )}
            </div>

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
