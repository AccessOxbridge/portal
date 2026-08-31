'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/utils/lib'
import { attachmentPreviewLabel } from '@/lib/chat-attachments'
import { stripFormatting } from '@/lib/chat-format'
import { formatGroupTitle, type ChatGroupMember } from '@/lib/chat-groups'

export interface ConversationSummary {
    id: string
    student_id: string | null
    mentor_id: string | null
    admin_id?: string | null
    type?: 'mentor' | 'support' | 'mentor_support' | 'group'
    last_message_at: string
    other_user: {
        id: string
        full_name: string | null
        photo_url?: string | null
        role_label?: string | null
    }
    admin_user?: { id: string; full_name: string } | null
    members?: ChatGroupMember[]
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

                // Markers off: a one-line preview should read as the sentence
                // does in the thread, not as `*urgent* — see the _brief_`.
                const raw = conversation.last_message?.content?.replace(/^\[ADMIN\]\s*/, '')
                const text = raw ? stripFormatting(raw) : ''

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
                            {conversation.type === 'group' ? (
                                <GroupAvatars
                                    members={conversation.members || []}
                                    currentUserId={currentUserId}
                                />
                            ) : conversation.other_user.photo_url ? (
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
                                    {conversation.type === 'group'
                                        ? formatGroupTitle(conversation.members || [], currentUserId)
                                        : conversation.other_user.full_name || 'User'}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0">
                                    {formatDistanceToNow(new Date(conversation.last_message_at), {
                                        addSuffix: true,
                                    })}
                                </span>
                            </div>

                            {conversation.type === 'group' ? (
                                <span className="inline-block my-0.5 px-1.5 py-0.5 rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                                    Group
                                </span>
                            ) : conversation.other_user.role_label ? (
                                <span className="inline-block my-0.5 px-1.5 py-0.5 rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                                    {conversation.other_user.role_label}
                                </span>
                            ) : null}

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

            {/* A single conversation leaves a tall white void below. A quiet
                closing line gives the column a bottom edge and explains what
                would otherwise appear here. */}
            <p className="px-4 py-4 text-[11px] leading-relaxed text-gray-300 border-t border-gray-100 mt-1">
                {conversations.length === 1
                    ? 'Your other conversations will appear here as they start.'
                    : `${conversations.length} conversations`}
            </p>
        </div>
    )
}

function GroupAvatars({
    members,
    currentUserId,
}: {
    members: ChatGroupMember[]
    currentUserId: string
}) {
    const others = members.filter((m) => m.role !== 'admin' && m.user_id !== currentUserId)
    const shown = others.slice(0, 2)

    if (shown.length === 0) {
        return (
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white font-semibold">
                G
            </div>
        )
    }

    return (
        <div className="relative w-11 h-11">
            {shown.map((member, index) => (
                <div
                    key={member.user_id}
                    className={cn(
                        'absolute w-7 h-7 rounded-full overflow-hidden ring-2 ring-white',
                        index === 0 ? 'left-0 top-0 z-10' : 'right-0 bottom-0 z-0'
                    )}
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
    )
}
