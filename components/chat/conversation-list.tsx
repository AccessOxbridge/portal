'use client'

import { formatDistanceToNow } from 'date-fns'

interface Conversation {
    id: string
    student_id: string
    mentor_id: string | null
    type?: 'mentor' | 'support'
    last_message_at: string
    other_user: {
        id: string
        full_name: string | null
        photo_url?: string | null
    }
    last_message?: {
        content: string
        sender_id: string
    } | null
    unread_count?: number
}

interface ConversationListProps {
    conversations: Conversation[]
    selectedId: string | null
    onSelect: (conversation: Conversation) => void
    currentUserId: string
}

export default function ConversationList({
    conversations,
    selectedId,
    onSelect,
    currentUserId
}: ConversationListProps) {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs text-gray-300 mt-1">Start chatting with your mentors!</p>
            </div>
        )
    }

    return (
        <div className="divide-y divide-gray-50">
            {conversations.map((conversation) => {
                const isSelected = selectedId === conversation.id
                const hasUnread = (conversation.unread_count ?? 0) > 0
                const lastMessagePreview = conversation.last_message?.content
                    ? conversation.last_message.content.length > 40
                        ? conversation.last_message.content.slice(0, 40) + '...'
                        : conversation.last_message.content
                    : 'No messages yet'
                const isSender = conversation.last_message?.sender_id === currentUserId

                return (
                    <button
                        key={conversation.id}
                        onClick={() => onSelect(conversation)}
                        className={`w-full flex items-center gap-3 p-4 text-left transition-all ${isSelected
                                ? 'bg-blue-50 border-l-2 border-blue-500'
                                : 'hover:bg-gray-50 border-l-2 border-transparent'
                            }`}
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            {conversation.other_user.photo_url ? (
                                <img
                                    src={conversation.other_user.photo_url}
                                    alt={conversation.other_user.full_name || 'User'}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                    {conversation.other_user.full_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                            {hasUnread && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                    {conversation.unread_count}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className={`font-semibold text-sm truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {conversation.other_user.full_name || 'User'}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                                    {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                                </span>
                            </div>
                            <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                {isSender && <span className="text-gray-400">You: </span>}
                                {lastMessagePreview}
                            </p>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
