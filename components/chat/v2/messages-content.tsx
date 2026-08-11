'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageSquare } from 'lucide-react'
import { cn } from '@/utils/lib'
import ConversationList, { type ConversationSummary } from './conversation-list'
import ChatWindow from './chat-window'
import { useLiveConversations } from './use-live-conversations'
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
    conversations: initialConversations,
    currentUserId,
    connectedUsers,
    userRole,
    initialMentorId,
    initialSupport = false,
    allowNewConversation = true,
}: MessagesContentProps) {
    const router = useRouter()
    const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(
        initialConversations.length > 0 ? initialConversations[0] : null
    )
    const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)
    const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('list')

    // Previews, timestamps, ordering and unread counts now update as messages
    // arrive, instead of being frozen at whatever the server rendered.
    const { conversations, markRead } = useLiveConversations(
        initialConversations,
        currentUserId,
        selectedConversation?.id ?? null
    )

    const openConversation = (conversation: ConversationSummary) => {
        setSelectedConversation(conversation)
        setMobilePane('thread')
        markRead(conversation.id)
    }

    // The thread that opens on load has its messages marked read by ChatWindow,
    // so clear the pill the server rendered for it too.
    useEffect(() => {
        if (selectedConversation) markRead(selectedConversation.id)
        // Mount only: later opens go through openConversation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!initialMentorId || conversations.length === 0) return
        const withMentor = conversations.find((c) => c.mentor_id === initialMentorId)
        if (withMentor) {
            setSelectedConversation(withMentor)
            setMobilePane('thread')
            markRead(withMentor.id)
            router.replace('/dashboard/student/messages', { scroll: false })
        }
    }, [initialMentorId, conversations, router, markRead])

    useEffect(() => {
        if (!initialSupport || conversations.length === 0) return
        const support = conversations.find((c) => c.type === 'support')
        if (support) {
            setSelectedConversation(support)
            setMobilePane('thread')
            markRead(support.id)
            router.replace('/dashboard/student/messages', { scroll: false })
        }
    }, [initialSupport, conversations, router, markRead])

    const placeholderText =
        userRole === 'student' ? 'Choose a mentor to start chatting' : 'Choose a student to start chatting'

    return (
        <>
            {/* No card. Work chat tools (Slack, Teams, Missive, ManyChat) run
                the panes edge to edge and separate them with a hairline; a
                floating rounded box on grey is what made this read as a widget
                rather than a workspace. */}
            <div className="flex flex-1 min-h-0 bg-white border-t border-gray-200/70 overflow-hidden">
                <div
                    className={cn(
                        'w-full md:w-80 shrink-0 md:border-r border-gray-200/70 bg-white flex-col',
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
