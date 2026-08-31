'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Trophy } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { MILESTONE_COPY, type Milestone } from '@/config/milestones.config'

/**
 * The milestone this student has just reached and not yet been shown. Chosen
 * server-side in the dashboard layout, so the celebration can fire on any
 * dashboard page rather than only the ones that happen to count sessions.
 */
export interface StudentMilestone {
    milestone: Milestone
    /** Completed-session count at selection time, stored alongside the ack row. */
    sessionsCompleted: number
}

interface MilestoneModalProps {
    milestone: StudentMilestone | null
    /**
     * Held back until the feedback popup is finished with. Two modals stacked
     * on load would bury the celebration behind a form.
     */
    ready: boolean
    /**
     * Render and animate, but never record the acknowledgement. Used only by
     * the dev-only /dashboard/milestone-preview harness, so the celebration can
     * be looked at without burning a real student's one-time moment.
     */
    preview?: boolean
}

/** Access Oxbridge navy, light navy and the two rich accents from globals.css. */
const CONFETTI_COLORS = ['#092c68', '#595a81', '#ffb81d', '#4f868e', '#ebf3f3']

/**
 * Congratulations popup for a session-count milestone.
 *
 * Mounted globally by StudentCreditsProvider. The confetti library is imported
 * dynamically so its ~3.5 kB only ever downloads for the student who actually
 * earned a milestone, and never on the other 99% of page loads.
 */
export default function MilestoneModal({ milestone, ready, preview = false }: MilestoneModalProps) {
    const [isOpen, setIsOpen] = useState(true)
    const supabase = createClient()

    const visible = !!milestone && ready && isOpen

    // The acknowledgement write. Fired once the celebration is actually on
    // screen rather than when it is chosen, so a student who never sees it
    // (page closed while the feedback popup was still up) gets it next time.
    const acknowledged = useRef(false)

    useEffect(() => {
        if (!visible || !milestone || acknowledged.current) return
        acknowledged.current = true

        let cancelled = false

        const run = async () => {
            // Confetti first: it is the point of the feature, and it should not
            // wait on a network round trip.
            try {
                const { default: confetti } = await import('canvas-confetti')
                if (cancelled) return

                // Two bursts from the lower corners, angled inwards, so the
                // particles arc over the card rather than landing on it. The
                // bigger milestones get a longer, denser show.
                const intensity = milestone.milestone >= 20 ? 1.6 : 1
                const fire = (originX: number, angle: number) =>
                    confetti({
                        particleCount: Math.round(60 * intensity),
                        spread: 70,
                        angle,
                        startVelocity: 45,
                        origin: { x: originX, y: 0.9 },
                        colors: CONFETTI_COLORS,
                        disableForReducedMotion: true,
                        zIndex: 1100,
                    })

                fire(0.15, 60)
                fire(0.85, 120)
                if (intensity > 1) {
                    setTimeout(() => {
                        if (!cancelled) {
                            fire(0.3, 70)
                            fire(0.7, 110)
                        }
                    }, 300)
                }
            } catch (err) {
                // A blocked or failed chunk must not cost the student the
                // message itself, which is the part that matters.
                console.error('Failed to load confetti:', err)
            }

            if (preview) return

            // Best-effort ack. If it fails the student sees the same
            // celebration once more on a later load, which is a far better
            // failure than blocking the popup behind a write.
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                await supabase.from('student_session_milestones').insert({
                    student_id: user.id,
                    milestone: milestone.milestone,
                    sessions_completed: milestone.sessionsCompleted,
                })
            } catch (err) {
                console.error('Failed to record session milestone:', err)
            }
        }

        run()

        return () => {
            cancelled = true
        }
    }, [visible, milestone, preview, supabase])

    // Same overlay bookkeeping as the feedback popup: hide the dashboard's
    // fixed chrome (credits pill, notification bell, Help & Support) and stop
    // the page scrolling behind the card. See assets/globals.css.
    useEffect(() => {
        if (!visible) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        document.body.setAttribute('data-overlay-open', '')

        return () => {
            document.body.style.overflow = previousOverflow
            document.body.removeAttribute('data-overlay-open')
        }
    }, [visible])

    useEffect(() => {
        if (!visible) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [visible])

    if (!visible || !milestone) return null

    const copy = MILESTONE_COPY[milestone.milestone]
    const close = () => setIsOpen(false)

    return (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={close}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={copy.title}
                className="relative bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
                <button
                    type="button"
                    onClick={close}
                    className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/70 flex items-center justify-center hover:bg-white transition-colors z-10"
                    aria-label="Close"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>

                <div className="bg-gradient-to-b from-rich-beige-accent to-white px-6 pt-10 pb-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto shadow-lg">
                        <Trophy className="w-8 h-8 text-rich-amber-accent" />
                    </div>
                    <p className="mt-5 inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wide">
                        {copy.badge}
                    </p>
                    <h2 className="mt-3 text-2xl font-extrabold text-gray-900">{copy.title}</h2>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{copy.body}</p>
                </div>

                <div className="px-6 pb-6">
                    <button
                        type="button"
                        onClick={close}
                        className="w-full py-3 bg-accent text-white font-bold rounded-2xl hover:opacity-95 transition-opacity"
                    >
                        Keep going
                    </button>
                </div>
            </div>
        </div>
    )
}
