'use client'

import { useState } from 'react'
import { ChatCentered as MessageSquare, X, CircleNotch as Loader2 } from '@phosphor-icons/react/ssr'
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
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                title="Message Mentor"
            >
                <MessageSquare className="size-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="border border-transparent relative w-full max-w-lg h-[640px] max-h-[85vh] bg-card rounded-sheet overflow-hidden flex flex-col shadow-overlay animate-in fade-in-0 zoom-in-96 duration-200 ease-snappy motion-reduce:animate-none">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/60">
                            <div>
                                <p className="text-sm font-semibold text-foreground">Message {mentorName}</p>
                                <p className="text-[11px] text-muted-foreground">Sending as Claire Marlowe · Access Oxbridge</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X className="size-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-h-0 flex flex-col">
                            {isLoading || !thread ? (
                                error ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                                        <p className="text-sm text-destructive font-medium">{error}</p>
                                        <button
                                            onClick={openChat}
                                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3 mt-3"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <Loader2 className="size-6 text-primary animate-spin" />
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
