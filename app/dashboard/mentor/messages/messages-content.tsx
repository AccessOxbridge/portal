'use client'

import { useState } from 'react'
import ConversationList from '@/components/chat/conversation-list'
import ChatWindow from '@/components/chat/chat-window'

interface Conversation {
    id: string
    student_id: string
    mentor_id: string
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

interface MessagesContentProps {
    conversations: Conversation[]
    currentUserId: string
}

export default function MessagesContent({
    conversations,
    currentUserId
}: MessagesContentProps) {
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
        conversations.length > 0 ? conversations[0] : null
    )

    return (
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100%-80px)]">
            {/* Conversation List */}
            <div className="w-80 border-r border-gray-100 overflow-y-auto bg-white">
                <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-gray-50">
                    <h2 className="font-semibold text-gray-700 text-sm">Conversations</h2>
                </div>
                <ConversationList
                    conversations={conversations}
                    selectedId={selectedConversation?.id || null}
                    onSelect={setSelectedConversation}
                    currentUserId={currentUserId}
                />
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <ChatWindow
                        conversationId={selectedConversation.id}
                        currentUserId={currentUserId}
                        otherUser={selectedConversation.other_user}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-lg font-medium">Select a conversation</p>
                        <p className="text-sm text-gray-300 mt-1">Choose a student to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    )
}
