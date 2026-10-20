'use client'

import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import SessionRatingCard from '@/components/feedback/session-rating-card'
import { sheet } from '@/components/ui/sheet-classes'
import { cn } from '@/utils/lib'

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
        <div className={sheet.root}>
            <div
                className={sheet.overlay}
                onClick={handleDismiss}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Rate your session"
                className={cn(sheet.panel, 'overflow-y-auto overscroll-contain sm:max-w-md')}
            >
                <button
                    type="button"
                    onClick={handleDismiss}
                    className={cn(sheet.close, 'absolute top-5 right-5 z-10')}
                    aria-label="Close"
                >
                    <X className="size-5" />
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
