'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import SessionRatingCard from '@/components/feedback/session-rating-card'

/**
 * The one session this student is currently being asked to rate. Selected
 * server-side in the dashboard layout — newest first, inside the prompt
 * window, not already rated or dismissed.
 */
export interface RateableSession {
    id: string
    mentorName: string
    mentorPhotoUrl?: string | null
    scheduledAt: string | null
}

interface RateSessionModalProps {
    session: RateableSession | null
    /**
     * Called once the popup is out of the way, whichever route the student
     * took: submitted and pressed Done, pressed "Not now", or closed it. The
     * provider uses this to release the milestone celebration, which queues
     * behind this popup rather than stacking on top of it.
     */
    onClosed?: () => void
}

/**
 * Dashboard popup wrapper around SessionRatingCard. This file owns only the
 * overlay chrome and the dismissal write; the questions themselves live in the
 * shared card so the popup and the full feedback page stay identical.
 *
 * Mounted with `key={session.id}` by the provider, so a different session
 * arrives as a fresh component with fresh state — no reset effect needed.
 */
export default function RateSessionModal({ session, onClosed }: RateSessionModalProps) {
    const [isOpen, setIsOpen] = useState(true)
    const supabase = createClient()

    const close = () => {
        setIsOpen(false)
        onClosed?.()
    }

    const overlayVisible = !!session && isOpen

    // The dashboard's floating chrome (notification bell, credits pill, Help &
    // Support) is fixed at z-100/z-999 in the root layout and would sit on top
    // of this overlay. globals.css hides anything marked [data-floating-ui]
    // while `data-overlay-open` is set on the body — same mechanism the chat
    // image lightbox uses. Also stops the dashboard scrolling behind the modal.
    useEffect(() => {
        if (!overlayVisible) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        document.body.setAttribute('data-overlay-open', '')

        return () => {
            document.body.style.overflow = previousOverflow
            document.body.removeAttribute('data-overlay-open')
        }
    }, [overlayVisible])

    if (!session || !isOpen) return null

    /**
     * "Not now" records a dismissal so this session is never popped up again.
     * It stays rateable from the sessions list — we suppress the prompt, not
     * the feedback. The write is best-effort: if it fails we still close, since
     * blocking the student behind a nudge would be worse than asking twice.
     */
    const handleDismiss = async () => {
        close()
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await supabase
                .from('session_feedback_prompts')
                .insert({ session_id: session.id, student_id: user.id })
        } catch (err) {
            console.error('Failed to record feedback prompt dismissal:', err)
        }
    }

    return (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleDismiss}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Rate your session"
                className="relative bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-md max-h-[92dvh] overflow-y-auto"
            >
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="absolute top-6 right-6 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
                    aria-label="Close"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>

                <SessionRatingCard
                    sessionId={session.id}
                    mentorName={session.mentorName}
                    mentorPhotoUrl={session.mentorPhotoUrl}
                    scheduledAt={session.scheduledAt}
                    secondaryAction={{ label: 'Not now', onClick: handleDismiss }}
                    successCta={{ label: 'Done', onClick: close }}
                />
            </div>
        </div>
    )
}
