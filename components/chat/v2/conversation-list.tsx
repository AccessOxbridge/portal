'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/utils/lib'
import { attachmentPreviewLabel } from '@/lib/chat-attachments'

export interface ConversationSummary {
    id: string
    student_id: string | null
    mentor_id: string | null
    admin_id?: string | null
    type?: 'mentor' | 'support' | 'mentor_support'
    last_message_at: string
    other_user: {
        id: string
        full_name: string | null
        photo_url?: string | null
        role_label?: string | null
    }
    admin_user?: { id: string; full_name: string } | null
    last_message?: {
        content: string
        sender_id: string
        /** Raw jsonb from the database; narrowed by toChatAttachments. */
        attachments?: unknown
    } | null
    unread_count?: number
}

interface ConversationListProps {
    conversations: ConversationSummary[]
    selectedId: string | null
    onSelect: (conversation: ConversationSummary) => void
    currentUserId: string
}

export default function ConversationList({
    conversations,
    selectedId,
    onSelect,
    currentUserId,
}: ConversationListProps) {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                <MessageSquare className="w-12 h-12 mb-3 text-gray-200" strokeWidth={1.5} />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs text-gray-300 mt-1">Your chats will appear here.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col">
            {conversations.map((conversation) => {
                const isSelected = selectedId === conversation.id
                const hasUnread = (conversation.unread_count ?? 0) > 0
                const isSender = conversation.last_message?.sender_id === currentUserId

                const text = conversation.last_message?.content?.replace(/^\[ADMIN\]\s*/, '').trim()

                // An image-only message has empty content — without this the row
                // would render blank.
                const preview =
                    text ||
                    attachmentPreviewLabel(conversation.last_message?.attachments) ||
                    (conversation.last_message ? '📎 Attachment' : 'No messages yet')

                return (
                    <button
                        key={conversation.id}
                        onClick={() => onSelect(conversation)}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-l-2',
                            isSelected
                                ? 'bg-accent/[0.06] border-accent'
                                : 'border-transparent hover:bg-gray-50'
                        )}
                    >
                        <div className="relative shrink-0">
                            {conversation.other_user.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={conversation.other_user.photo_url}
                                    alt={conversation.other_user.full_name || 'User'}
                                    className="w-11 h-11 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white font-semibold">
                                    {conversation.other_user.full_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                            {hasUnread && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-accent rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white">
                                    {conversation.unread_count}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                                <span
                                    className={cn(
                                        'text-sm truncate',
                                        hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
                                    )}
                                >
                                    {conversation.other_user.full_name || 'User'}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0">
                                    {formatDistanceToNow(new Date(conversation.last_message_at), {
                                        addSuffix: true,
                                    })}
                                </span>
                            </div>

                            {conversation.other_user.role_label && (
                                <span className="inline-block my-0.5 px-1.5 py-0.5 rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                                    {conversation.other_user.role_label}
                                </span>
                            )}

                            <p
                                className={cn(
                                    'text-xs truncate',
                                    hasUnread ? 'text-gray-700 font-medium' : 'text-gray-400'
                                )}
                            >
                                {isSender && <span className="text-gray-400">You: </span>}
                                {preview}
                            </p>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
