'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, BookOpen, CalendarCheck, CalendarPlus, CheckCircle as CheckCircle2, Clock } from '@phosphor-icons/react/ssr'
import { sheet } from '@/components/ui/sheet-classes'
import { cn } from '@/utils/lib'
import { createClient } from '@/utils/supabase/client'
import MentorRequestSessionModal, {
    type MentorRequestStudentOption,
} from '@/components/dashboard/mentor-request-session-modal'
import type { MentorSessionCheckin } from '@/lib/mentor-session-checkin'

interface MentorSessionCheckinModalProps {
    /** The session to check in about, chosen server-side. Null means nothing to ask. */
    checkin: MentorSessionCheckin | null
    /** This mentor's current students, for the nested Request a Session modal. */
    students: MentorRequestStudentOption[]
    mentorTimezone?: string | null
    /**
     * Dev-only harness mode: render and behave exactly as normal but never
     * write to `mentor_session_checkins`, so the popup can be replayed. Used by
     * /dashboard/mentor-checkin-preview.
     */
    preview?: boolean
}

/**
 * The mentor post-session check-in: two yes/no questions and a shortcut to the
 * existing Request a Session modal, shown on the next dashboard load after a
 * session completes.
 *
 * Mirrors the student's rate-session-modal in shape and behaviour on purpose —
 * same overlay chrome, same "one session at a time", same "closing it counts,
 * we never ask about that session again". The one difference is that the
 * booking question is skipped when the calendar can already answer it.
 *
 * Mounted with `key={checkin.sessionId}` by the layout, so a different session
 * arrives as a fresh component with fresh state — no reset effect needed.
 */
export default function MentorSessionCheckinModal({
    checkin,
    students,
    mentorTimezone,
    preview = false,
}: MentorSessionCheckinModalProps) {
    const router = useRouter()
    const supabase = createClient()

    const [isOpen, setIsOpen] = useState(true)
    const [homeworkGiven, setHomeworkGiven] = useState<boolean | null>(null)
    const [nextBooked, setNextBooked] = useState<boolean | null>(null)
    const [requestOpen, setRequestOpen] = useState(false)
    const [requestSent, setRequestSent] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Only asked when nothing is already on the books — see NextSessionState.
    const askBooking = checkin?.nextSessionState === 'none'

    // The dashboard's floating chrome (notification bell, Help & Support) is
    // fixed at z-100/z-999 in the root layout and would sit on top of this
    // overlay. globals.css hides anything marked [data-floating-ui] while
    // `data-overlay-open` is set on the body — same mechanism the chat image
    // lightbox and the student rating popup use. Also stops the dashboard
    // scrolling behind the modal.
    const overlayVisible = !!checkin && isOpen
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

    if (!checkin || !isOpen) return null

    const firstName = checkin.studentName.split(' ')[0] || checkin.studentName

    const sessionDate = checkin.scheduledAt
        ? new Date(checkin.scheduledAt).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
          })
        : null

    const nextSessionLabel = checkin.nextSessionAt
        ? new Date(checkin.nextSessionAt).toLocaleString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
          })
        : null

    /**
     * One insert per session, whichever way the mentor leaves. The row's
     * existence is what suppresses the prompt, so a dismissal is stored just
     * like an answer — `dismissed` is what tells the two apart later.
     *
     * Best-effort on the write path: if it fails we still close, because
     * trapping a mentor behind a nudge would be worse than asking twice.
     */
    const record = async (row: {
        homework_given: boolean | null
        next_session_booked: boolean | null
        dismissed: boolean
    }) => {
        if (preview) return
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await supabase
                .from('mentor_session_checkins')
                .insert({ session_id: checkin.sessionId, mentor_id: user.id, ...row })
        } catch (err) {
            console.error('Failed to record mentor session check-in:', err)
        }
    }

    const handleDismiss = async () => {
        setIsOpen(false)
        await record({ homework_given: null, next_session_booked: null, dismissed: true })
    }

    const handleSubmit = async () => {
        if (homeworkGiven === null) {
            setError('Please answer the homework question.')
            return
        }
        if (askBooking && nextBooked === null) {
            setError('Please answer the booking question.')
            return
        }

        setSaving(true)
        setError(null)
        await record({
            homework_given: homeworkGiven,
            // Null when the question was never asked, so "not asked" stays
            // distinguishable from "the mentor said no".
            next_session_booked: askBooking ? nextBooked : null,
            dismissed: false,
        })
        setIsOpen(false)
        setSaving(false)
        if (!preview) router.refresh()
    }

    // While the Request a Session modal is up, the check-in card steps out of
    // the way rather than stacking behind it — two overlays deep reads as a
    // bug, and the request modal is a full-screen sheet of its own.
    if (requestOpen) {
        return (
            <MentorRequestSessionModal
                isOpen
                onClose={() => setRequestOpen(false)}
                students={students}
                preselectedStudentId={checkin.studentId}
                mentorTimezone={mentorTimezone}
                onSubmitted={() => {
                    // They just proposed a time, so the booking question is
                    // answered by the act itself.
                    setRequestSent(true)
                    setNextBooked(true)
                    setError(null)
                }}
            />
        )
    }

    const yesNo = (
        value: boolean | null,
        onChange: (next: boolean) => void,
        label: string
    ) => (
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={label}>
            {[true, false].map((option) => {
                const selected = value === option
                return (
                    <button
                        key={String(option)}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                            onChange(option)
                            setError(null)
                        }}
                        className={`py-3 rounded-card border-2 font-semibold transition-colors ${
                            selected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-muted/60 text-muted-foreground hover:border-border'
                        }`}
                    >
                        {option ? 'Yes' : 'No'}
                    </button>
                )
            })}
        </div>
    )

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
                aria-label="Post-session check-in"
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

                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                        <BookOpen weight="duotone" className="size-6" />
                    </div>
                    <div className="pr-10">
                        <h2 className="text-lg font-semibold text-foreground">Quick check-in</h2>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            Your session with {checkin.studentName}
                            {sessionDate ? ` on ${sessionDate}` : ''}
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-3">
                        <p className="font-semibold text-foreground">
                            Did you set {firstName} some homework?
                        </p>
                        {yesNo(homeworkGiven, setHomeworkGiven, 'Did you set homework?')}
                    </div>

                    {askBooking ? (
                        <div className="space-y-3">
                            <p className="font-semibold text-foreground">
                                Is your next session with {firstName} booked in?
                            </p>
                            {yesNo(nextBooked, setNextBooked, 'Is your next session booked?')}
                            {nextBooked === false && !requestSent && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Propose a time now and {firstName} can confirm it from their
                                    Pending tab.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 p-4 bg-tint-green border border-border rounded-card">
                            {checkin.nextSessionState === 'scheduled' ? (
                                <>
                                    <CalendarCheck className="size-5 text-success shrink-0 mt-0.5" />
                                    <p className="text-sm text-tint-green-foreground">
                                        Your next session with {firstName} is booked
                                        {nextSessionLabel ? ` for ${nextSessionLabel}` : ''}.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Clock className="size-5 text-success shrink-0 mt-0.5" />
                                    <p className="text-sm text-tint-green-foreground">
                                        You&apos;ve already proposed a time to {firstName} —
                                        waiting on them to confirm.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {requestSent && (
                        <div className="flex items-start gap-3 p-4 bg-tint-green border border-border rounded-card">
                            <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                            <p className="text-sm text-tint-green-foreground">
                                Request sent. {firstName} will see it in their Pending tab.
                            </p>
                        </div>
                    )}

                    {/* Always available, whatever the answers say: a mentor who
                        wants another session on the books should never have to
                        close this first to get to the button. */}
                    <button
                        type="button"
                        onClick={() => setRequestOpen(true)}
                        className="w-full py-3 border-2 border-primary text-primary font-semibold rounded-card hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                    >
                        <CalendarPlus className="size-4" />
                        {requestSent ? 'Request another session' : 'Request a session'}
                    </button>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="w-full py-3 bg-primary text-white font-semibold rounded-card hover:opacity-95 transition-opacity disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : 'Done'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="w-full py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Not now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
