'use client'

import { formatDistanceToNow } from 'date-fns'
import { ChatCentered as MessageSquare } from '@phosphor-icons/react/ssr'
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
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                <MessageSquare className="size-12 mb-3 text-muted-foreground/60" strokeWidth={1.5} />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Your chats will appear here.</p>
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
                                ? 'bg-primary/[0.06] border-primary'
                                : 'border-transparent hover:bg-muted/60'
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
                                    className="size-11 rounded-full object-cover"
                                />
                            ) : (
                                <div className="size-11 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                                    {conversation.other_user.full_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                            {hasUnread && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-white">
                                    {conversation.unread_count}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                                <span
                                    className={cn(
                                        'text-sm',
                                        conversation.type === 'group' ? 'leading-snug' : 'truncate',
                                        hasUnread ? 'font-semibold text-foreground' : 'font-semibold text-foreground'
                                    )}
                                >
                                    {conversation.type === 'group'
                                        ? formatGroupTitle(conversation.members || [], currentUserId)
                                        : conversation.other_user.full_name || 'User'}
                                </span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                    {formatDistanceToNow(new Date(conversation.last_message_at), {
                                        addSuffix: true,
                                    })}
                                </span>
                            </div>

                            {conversation.type === 'group' ? (
                                <span className="inline-block my-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                    Group
                                </span>
                            ) : conversation.other_user.role_label ? (
                                <span className="inline-block my-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                    {conversation.other_user.role_label}
                                </span>
                            ) : null}

                            <p
                                className={cn(
                                    'text-xs truncate',
                                    hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                                )}
                            >
                                {isSender && <span className="text-muted-foreground">You: </span>}
                                {preview}
                            </p>
                        </div>
                    </button>
                )
            })}

            {/* A single conversation leaves a tall white void below. A quiet
                closing line gives the column a bottom edge and explains what
                would otherwise appear here. */}
            <p className="px-4 py-4 text-[11px] leading-relaxed text-muted-foreground/60 border-t border-border mt-1">
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
            <div className="size-11 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                G
            </div>
        )
    }

    return (
        <div className="relative size-11">
            {shown.map((member, index) => (
                <div
                    key={member.user_id}
                    className={cn(
                        'absolute size-7 rounded-full overflow-hidden ring-2 ring-white',
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
                        <div className="w-full h-full bg-primary flex items-center justify-center text-white text-[10px] font-semibold">
                            {member.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
