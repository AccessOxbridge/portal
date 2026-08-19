'use client'

import { useState } from 'react'
import { MessageSquare, X, Loader2 } from 'lucide-react'
import ChatWindow from '@/components/chat/v2/chat-window'
import { ensureMentorSupportThread } from '../../messages/actions'

interface MentorMessageButtonProps {
    mentorId: string
    mentorName: string
    photoUrl?: string | null
}

/**
 * Admin affordance to message a mentor directly. Opens a chat that, to the
 * mentor, appears to come from "Claire Marlowe" (the Access Oxbridge team).
 */
export function MentorMessageButton({ mentorId, mentorName, photoUrl }: MentorMessageButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [thread, setThread] = useState<{ conversationId: string; adminId: string } | null>(null)

    const openChat = async () => {
        setIsOpen(true)
        if (thread) return
        setIsLoading(true)
        setError(null)
        try {
            const result = await ensureMentorSupportThread(mentorId)
            setThread(result)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not open conversation')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={openChat}
                className="p-2 text-gray-400 hover:text-accent transition-colors"
                title="Message Mentor"
            >
                <MessageSquare className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="relative w-full max-w-lg h-[640px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Message {mentorName}</p>
                                <p className="text-[11px] text-gray-400">Sending as Claire Marlowe · Access Oxbridge</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-h-0 flex flex-col">
                            {isLoading || !thread ? (
                                error ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                                        <p className="text-sm text-red-600 font-medium">{error}</p>
                                        <button
                                            onClick={openChat}
                                            className="mt-3 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-colors"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-accent animate-spin" />
                                    </div>
                                )
                            ) : (
                                <ChatWindow
                                    conversationId={thread.conversationId}
                                    currentUserId={thread.adminId}
                                    otherUser={{
                                        id: mentorId,
                                        full_name: mentorName,
                                        photo_url: photoUrl || null,
                                    }}
                                    allParticipants={{
                                        student_id: null,
                                        mentor_id: mentorId,
                                        admin_id: thread.adminId,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
