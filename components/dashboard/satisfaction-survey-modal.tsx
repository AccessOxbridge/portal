'use client'

import { useEffect, useState } from 'react'
import { X, PaperPlaneRight as Send, CheckCircle as CheckCircle2, ChatTeardropText as MessageSquareHeart } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import {
    SURVEY_QUESTIONS,
    SURVEY_COMMENT_MAX_LENGTH,
    type SurveyQuestion,
} from '@/config/satisfaction.config'
import type { DueSatisfactionSurvey } from '@/lib/student-satisfaction'
import { sheet } from '@/components/ui/sheet-classes'
import { buttonVariants } from '@/components/ui/button'
import { fieldBase } from '@/components/ui/input'
import { cn } from '@/utils/lib'

interface SatisfactionSurveyModalProps {
    isOpen: boolean
    onClose: () => void
    /** The tier being answered for. Null means nothing is due and nothing renders. */
    survey: DueSatisfactionSurvey | null
    /**
     * Called once the answers are saved, so the chip can retire itself
     * without waiting for a router refresh.
     */
    onSubmitted?: () => void
}

/**
 * The every-4-sessions satisfaction check-in.
 *
 * Opened from the check-in chip rather than firing on load: the student is
 * usually mid-task, and an unclosable popup ambushing them is a worse way to
 * ask how they are finding the portal than a prompt that waits. The chip is
 * what "persists until filled" — it never dismisses — so this modal is free to
 * have an ordinary close button.
 *
 * Deliberately one screen, not a wizard. Three identical rows of 1-5 chips
 * read as a single gesture; the same three questions split across three steps
 * read as a form, and the whole point is that it costs a couple of clicks.
 */
export default function SatisfactionSurveyModal({
    isOpen,
    onClose,
    survey,
    onSubmitted,
}: SatisfactionSurveyModalProps) {
    const [ratings, setRatings] = useState<Record<string, number>>({})
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const supabase = createClient()

    const visible = isOpen && !!survey

    // Same overlay bookkeeping as the feedback and milestone popups: hide the
    // dashboard's fixed chrome (credits pill, notification bell, Help &
    // Support) and stop the page scrolling behind the card. See globals.css.
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
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [visible, onClose])

    if (!visible || !survey) return null

    const allAnswered = SURVEY_QUESTIONS.every((q) => ratings[q.key] > 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!allAnswered) {
            setError('Please answer all three questions.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const trimmed = comment.trim()

            const { error: insertError } = await supabase
                .from('student_satisfaction_surveys')
                .insert({
                    student_id: user.id,
                    // The tier, not the live count — a second tab that submits
                    // after another session was completed must still land on
                    // the same primary key rather than creating a second row.
                    session_count: survey.tier,
                    sessions_completed: survey.sessionsCompleted,
                    portal_rating: ratings.portal_rating,
                    mentoring_rating: ratings.mentoring_rating,
                    progress_rating: ratings.progress_rating,
                    comment: trimmed || null,
                })

            if (insertError) throw insertError

            setSuccess(true)
            setLoading(false)
            onSubmitted?.()
        } catch (err) {
            console.error('Failed to submit satisfaction survey:', err)
            setError('Could not save your answers. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className={sheet.root}>
            <div
                className={sheet.overlay}
                onClick={onClose}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Quick check-in"
                className={cn(sheet.panel, 'overflow-y-auto overscroll-contain sm:max-w-lg')}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className={cn(sheet.close, 'absolute top-5 right-5 z-10')}
                    aria-label="Close"
                >
                    <X className="size-5" />
                </button>

                {success ? (
                    <div className="space-y-4 p-6 pt-14">
                        <div role="status" className="flex items-start gap-3 rounded-card bg-tint-green p-4">
                            <CheckCircle2 weight="fill" className="mt-0.5 size-5 shrink-0 text-success" />
                            <p className="text-sm text-tint-green-foreground text-pretty">
                                Thanks! That goes straight to the Access Oxbridge team and
                                genuinely shapes what we build next.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(buttonVariants(), 'w-full')}
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3.5 px-6 pt-6 pe-16 pb-2">
                            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-tint-rose text-tint-rose-foreground">
                                <MessageSquareHeart weight="fill" className="size-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    Quick check-in
                                </h2>
                                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                                    You&apos;re {survey.tier} sessions in. Three questions, about
                                    thirty seconds.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 p-6">
                            {SURVEY_QUESTIONS.map((question) => (
                                <RatingRow
                                    key={question.key}
                                    question={question}
                                    value={ratings[question.key] ?? 0}
                                    onChange={(value) => {
                                        setRatings((current) => ({
                                            ...current,
                                            [question.key]: value,
                                        }))
                                        setError(null)
                                    }}
                                />
                            ))}

                            <div>
                                <label
                                    htmlFor="satisfaction-comment"
                                    className="mb-2 block text-sm font-medium text-foreground"
                                >
                                    Anything you&apos;d like to add?{' '}
                                    <span className="font-normal text-muted-foreground">(optional)</span>
                                </label>
                                <textarea
                                    id="satisfaction-comment"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Anything working well, or anything we should fix?"
                                    rows={3}
                                    maxLength={SURVEY_COMMENT_MAX_LENGTH}
                                    className={cn(fieldBase, 'resize-none px-3.5 py-2.5 leading-relaxed')}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(buttonVariants(), 'w-full')}
                            >
                                <Send weight="fill" />
                                {loading ? 'Sending…' : 'Submit'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

/**
 * One question and its row of 1-5 chips.
 *
 * Chips rather than stars: stars carry a "rate this thing out of five" meaning
 * that fits a mentor but reads oddly against "do you feel like you're making
 * progress". Numbers with an anchor word at each end say what the scale means
 * without a legend.
 */
function RatingRow({
    question,
    value,
    onChange,
}: {
    question: SurveyQuestion
    value: number
    onChange: (value: number) => void
}) {
    return (
        <div>
            <p className="mb-3 text-sm font-medium text-foreground text-pretty">{question.label}</p>
            <div
                className="grid grid-cols-5 gap-2"
                role="radiogroup"
                aria-label={question.label}
            >
                {[1, 2, 3, 4, 5].map((option) => {
                    const selected = value === option
                    return (
                        <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(option)}
                            className={`h-11 rounded-full border text-base font-medium tabular-nums outline-none transition-[background-color,color,border-color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 ${
                                selected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-input bg-card text-foreground hover:bg-muted'
                            }`}
                        >
                            {option}
                        </button>
                    )
                })}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{question.lowLabel}</span>
                <span>{question.highLabel}</span>
            </div>
        </div>
    )
}
