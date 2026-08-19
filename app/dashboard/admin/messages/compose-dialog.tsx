'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Search, SquarePen, Users, X } from 'lucide-react'
import { cn } from '@/utils/lib'
import {
    ensureClaireThread,
    searchMessageRecipients,
    type ClaireThread,
    type MessageRecipient,
} from './actions'

interface ExistingThread {
    id: string
    type?: 'mentor' | 'support' | 'mentor_support'
    student_id: string | null
    mentor_id: string | null
}

interface ComposeDialogProps {
    onClose: () => void
    conversations: ExistingThread[]
    onOpened: (thread: ClaireThread, recipient: MessageRecipient) => void
}

function existingClaireThread(
    conversations: ExistingThread[],
    recipient: MessageRecipient
): ExistingThread | undefined {
    if (recipient.role === 'student') {
        return conversations.find(
            (c) => c.type === 'support' && c.student_id === recipient.id
        )
    }
    return conversations.find(
        (c) => c.type === 'mentor_support' && c.mentor_id === recipient.id
    )
}

export default function ComposeDialog({
    onClose,
    conversations,
    onOpened,
}: ComposeDialogProps) {
    const [query, setQuery] = useState('')
    const [recipients, setRecipients] = useState<MessageRecipient[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [openingId, setOpeningId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
        return () => window.clearTimeout(timer)
    }, [])

    useEffect(() => {
        let cancelled = false
        const handle = window.setTimeout(async () => {
            setIsSearching(true)
            setError(null)
            try {
                const results = await searchMessageRecipients(query)
                if (!cancelled) setRecipients(results)
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Could not search people')
                    setRecipients([])
                }
            } finally {
                if (!cancelled) setIsSearching(false)
            }
        }, query.trim() ? 200 : 0)

        return () => {
            cancelled = true
            window.clearTimeout(handle)
        }
    }, [query])

    const handleSelect = async (recipient: MessageRecipient) => {
        setOpeningId(recipient.id)
        setError(null)
        try {
            const existing = existingClaireThread(conversations, recipient)
            if (existing) {
                onOpened(
                    {
                        conversationId: existing.id,
                        adminId: '',
                        type: recipient.role === 'student' ? 'support' : 'mentor_support',
                        studentId: existing.student_id,
                        mentorId: existing.mentor_id,
                        createdAt: new Date().toISOString(),
                    },
                    recipient
                )
                onClose()
                return
            }

            const thread = await ensureClaireThread(recipient.id, recipient.role)
            onOpened(thread, recipient)
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not open conversation')
        } finally {
            setOpeningId(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md sm:mx-4 max-h-[92dvh] sm:max-h-[min(32rem,85vh)] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900">New message</h2>
                        <p className="text-sm text-gray-500">
                            Sends as Claire Marlowe · Access Oxbridge
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="px-6 py-3 border-b border-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search students or mentors…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent/30"
                        />
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    {error && (
                        <p className="px-6 py-3 text-sm text-red-600">{error}</p>
                    )}

                    {isSearching && recipients.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-5 h-5 text-accent animate-spin" />
                        </div>
                    ) : recipients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Users className="w-12 h-12 mb-3 text-gray-200" />
                            <p className="text-sm font-medium">
                                {query.trim() ? 'No matches found' : 'No people to message yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {recipients.map((recipient) => {
                                const existing = existingClaireThread(conversations, recipient)
                                const isOpening = openingId === recipient.id
                                return (
                                    <button
                                        key={recipient.id}
                                        type="button"
                                        onClick={() => handleSelect(recipient)}
                                        disabled={openingId !== null}
                                        className="w-full px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                                    >
                                        {recipient.photo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={recipient.photo_url}
                                                alt=""
                                                className="w-11 h-11 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white font-semibold shrink-0">
                                                {recipient.full_name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm text-gray-900 truncate">
                                                    {recipient.full_name || (recipient.role === 'student' ? 'Student' : 'Mentor')}
                                                </p>
                                                <span
                                                    className={cn(
                                                        'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                                        recipient.role === 'student'
                                                            ? 'bg-accent/10 text-accent'
                                                            : 'bg-rich-green-accent/10 text-rich-green-accent'
                                                    )}
                                                >
                                                    {recipient.role === 'student' ? 'Student' : 'Mentor'}
                                                </span>
                                            </div>
                                            {recipient.email && (
                                                <p className="text-xs text-gray-400 truncate">{recipient.email}</p>
                                            )}
                                            {existing && (
                                                <p className="text-xs text-green-600 font-medium">
                                                    Existing conversation
                                                </p>
                                            )}
                                        </div>

                                        {isOpening ? (
                                            <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />
                                        ) : (
                                            <MessageCircle
                                                className={cn(
                                                    'w-5 h-5 shrink-0',
                                                    existing ? 'text-green-500' : 'text-gray-300'
                                                )}
                                            />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export function ComposeButton({
    onClick,
    className,
}: {
    onClick: () => void
    className?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="New message"
            title="New message"
            className={cn(
                'p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-accent hover:border-accent/30 hover:bg-accent/[0.06] transition-colors shrink-0',
                className
            )}
        >
            <SquarePen className="w-4 h-4" />
        </button>
    )
}
