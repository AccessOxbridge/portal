'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageSquare } from 'lucide-react'
import { cn } from '@/utils/lib'
import ConversationList, { type ConversationSummary } from './conversation-list'
import ChatWindow from './chat-window'
// Reused as-is from the original chat components — unchanged behaviour.
import NewConversationDialog from '@/components/chat/new-conversation-dialog'

interface ConnectedUser {
    id: string
    full_name: string | null
    photo_url?: string | null
    hasExistingConversation: boolean
    conversationId?: string
}

interface MessagesContentProps {
    conversations: ConversationSummary[]
    currentUserId: string
    connectedUsers: ConnectedUser[]
    userRole: 'student' | 'mentor'
    initialMentorId?: string
    initialSupport?: boolean
    allowNewConversation?: boolean
}

/**
 * Drop-in replacement for components/chat/messages-content.tsx — same props,
 * same master/detail behaviour, rebuilt on the v2 chat components.
 */
export default function MessagesContent({
    conversations,
    currentUserId,
    connectedUsers,
    userRole,
    initialMentorId,
    initialSupport = false,
    allowNewConversation = true,
}: MessagesContentProps) {
    const router = useRouter()
    const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(
        conversations.length > 0 ? conversations[0] : null
    )
    const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)
    const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('list')

    const openConversation = (conversation: ConversationSummary) => {
        setSelectedConversation(conversation)
        setMobilePane('thread')
    }

    useEffect(() => {
        if (!initialMentorId || conversations.length === 0) return
        const withMentor = conversations.find((c) => c.mentor_id === initialMentorId)
        if (withMentor) {
            setSelectedConversation(withMentor)
            setMobilePane('thread')
            router.replace('/dashboard/student/messages', { scroll: false })
        }
    }, [initialMentorId, conversations, router])

    useEffect(() => {
        if (!initialSupport || conversations.length === 0) return
        const support = conversations.find((c) => c.type === 'support')
        if (support) {
            setSelectedConversation(support)
            setMobilePane('thread')
            router.replace('/dashboard/student/messages', { scroll: false })
        }
    }, [initialSupport, conversations, router])

    const placeholderText =
        userRole === 'student' ? 'Choose a mentor to start chatting' : 'Choose a student to start chatting'

    return (
        <>
            <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100%-80px)]">
                <div
                    className={cn(
                        'w-full md:w-80 shrink-0 md:border-r border-gray-100 bg-white flex-col',
                        mobilePane === 'list' ? 'flex' : 'hidden md:flex'
                    )}
                >
                    <div className="shrink-0 px-4 py-3 border-b border-gray-50 flex items-center justify-between">
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
                            onSelect={openConversation}
                            currentUserId={currentUserId}
                        />
                    </div>
                </div>

                <div
                    className={cn(
                        'flex-1 min-w-0 flex-col',
                        mobilePane === 'thread' ? 'flex' : 'hidden md:flex'
                    )}
                >
                    {selectedConversation ? (
                        <ChatWindow
                            key={selectedConversation.id}
                            conversationId={selectedConversation.id}
                            currentUserId={currentUserId}
                            otherUser={selectedConversation.other_user}
                            adminUser={selectedConversation.admin_user || undefined}
                            allParticipants={{
                                student_id: selectedConversation.student_id,
                                mentor_id: selectedConversation.mentor_id,
                                admin_id: selectedConversation.admin_id || undefined,
                            }}
                            onBack={() => setMobilePane('list')}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center px-6">
                            <MessageSquare className="w-14 h-14 mb-4 text-gray-200" strokeWidth={1.5} />
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
