'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import ConversationList from '@/components/chat/conversation-list'
import ChatWindow from '@/components/chat/chat-window'
import NewConversationDialog from '@/components/chat/new-conversation-dialog'

interface Conversation {
    id: string
    student_id: string
    mentor_id: string | null
    admin_id?: string | null
    type?: 'mentor' | 'support'
    last_message_at: string
    other_user: {
        id: string
        full_name: string | null
        photo_url?: string | null
    }
    admin_user?: {
        id: string
        full_name: string
    } | null
    last_message?: {
        content: string
        sender_id: string
    } | null
    unread_count?: number
}

interface ConnectedUser {
    id: string
    full_name: string | null
    photo_url?: string | null
    hasExistingConversation: boolean
    conversationId?: string
}

interface MessagesContentProps {
    conversations: Conversation[]
    currentUserId: string
    connectedUsers: ConnectedUser[]
    userRole: 'student' | 'mentor'
    /** When set, open the conversation with this mentor (student view). */
    initialMentorId?: string
    /** When true, open the Help & Support conversation (student view). */
    initialSupport?: boolean
    /** Whether the "New conversation" affordance is shown. */
    allowNewConversation?: boolean
}

export default function MessagesContent({
    conversations,
    currentUserId,
    connectedUsers,
    userRole,
    initialMentorId,
    initialSupport = false,
    allowNewConversation = true
}: MessagesContentProps) {
    const router = useRouter()
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
        conversations.length > 0 ? conversations[0] : null
    )
    const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)

    // Open specific mentor chat when navigating with ?mentor=
    useEffect(() => {
        if (!initialMentorId || conversations.length === 0) return
        const withMentor = conversations.find((c) => c.mentor_id === initialMentorId)
        if (withMentor) {
            setSelectedConversation(withMentor)
            // Clear URL so refreshing doesn't re-apply
            router.replace('/dashboard/student/messages', { scroll: false })
        }
    }, [initialMentorId, conversations, router])

    // Open the Help & Support chat when navigating with ?support=1
    useEffect(() => {
        if (!initialSupport || conversations.length === 0) return
        const support = conversations.find((c) => c.type === 'support')
        if (support) {
            setSelectedConversation(support)
            router.replace('/dashboard/student/messages', { scroll: false })
        }
    }, [initialSupport, conversations, router])

    // Dynamic placeholder text based on user role
    const placeholderText = userRole === 'student'
        ? 'Choose a mentor to start chatting'
        : 'Choose a student to start chatting'

    return (
        <>
            <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100%-80px)]">
                {/* Conversation List */}
                <div className="w-80 border-r border-gray-100 overflow-y-auto bg-white flex flex-col">
                    <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-700 text-sm">Conversations</h2>
                        {allowNewConversation && (
                            <button
                                onClick={() => setIsNewConversationOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <ConversationList
                            conversations={conversations}
                            selectedId={selectedConversation?.id || null}
                            onSelect={setSelectedConversation}
                            currentUserId={currentUserId}
                        />
                    </div>
                </div>

                {/* Chat Window */}
                <div className="flex-1 flex flex-col">
                    {selectedConversation ? (
                        <ChatWindow
                            conversationId={selectedConversation.id}
                            currentUserId={currentUserId}
                            otherUser={selectedConversation.other_user}
                            adminUser={selectedConversation.admin_user || undefined}
                            allParticipants={{
                                student_id: selectedConversation.student_id,
                                mentor_id: selectedConversation.mentor_id,
                                admin_id: selectedConversation.admin_id || undefined
                            }}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <svg className="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-lg font-medium">Select a conversation</p>
                            <p className="text-sm text-gray-300 mt-1">{placeholderText}</p>
                            {allowNewConversation && (
                                <button
                                    onClick={() => setIsNewConversationOpen(true)}
                                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Start a New Conversation
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* New Conversation Dialog */}
            {allowNewConversation && (
                <NewConversationDialog
                    isOpen={isNewConversationOpen}
                    onClose={() => setIsNewConversationOpen(false)}
                    currentUserId={currentUserId}
                    connectedUsers={connectedUsers}
                    userRole={userRole}
                />
            )}
        </>
    )
}
