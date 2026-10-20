'use client'

import { DotsThree as MoreHorizontal, CheckCircle as CheckCircle2, Clock, XCircle } from '@phosphor-icons/react/ssr'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MentorMessageButton } from './MentorMessageButton'
import { setMentorStatus } from '../actions'

interface MentorActionsProps {
    mentorId: string
    currentStatus: string
    mentorName: string
    photoUrl?: string | null
}

export function MentorActions({ mentorId, currentStatus, mentorName, photoUrl }: MentorActionsProps) {
    const router = useRouter()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const updateStatus = (newStatus: string) => {
        startTransition(async () => {
            const result = await setMentorStatus(mentorId, newStatus)
            if (!result.error) {
                router.refresh()
            }
            setIsMenuOpen(false)
        })
    }

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end gap-2">
                <MentorMessageButton mentorId={mentorId} mentorName={mentorName} photoUrl={photoUrl} />
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`p-2 transition-colors rounded-lg ${isMenuOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-muted-foreground'}`}
                    >
                        {isPending ? <Clock className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-control shadow-border z-20 py-1 overflow-hidden">
                                <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground border-b border-border">
                                    Change status
                                </div>
                                {currentStatus !== 'active' && (
                                    <button
                                        onClick={() => updateStatus('active')}
                                        className="w-full text-left px-4 py-2.5 text-sm text-success hover:bg-tint-green flex items-center gap-2 transition-colors font-medium"
                                    >
                                        <CheckCircle2 className="size-4" />
                                        Set active
                                    </button>
                                )}
                                {currentStatus !== 'pending_approval' && (
                                    <button
                                        onClick={() => updateStatus('pending_approval')}
                                        className="w-full text-left px-4 py-2.5 text-sm text-warning hover:bg-tint-amber flex items-center gap-2 transition-colors font-medium"
                                    >
                                        <Clock className="size-4" />
                                        Set pending
                                    </button>
                                )}
                                {currentStatus !== 'details_required' && (
                                    <button
                                        onClick={() => updateStatus('details_required')}
                                        className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 flex items-center gap-2 transition-colors font-medium"
                                    >
                                        <XCircle className="size-4" />
                                        Request details
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
