'use client'

import { useEffect, useState } from 'react'
import { X, Send, CheckCircle2, MessageSquareHeart } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import {
    SURVEY_QUESTIONS,
    SURVEY_COMMENT_MAX_LENGTH,
    type SurveyQuestion,
} from '@/config/satisfaction.config'
import type { DueSatisfactionSurvey } from '@/lib/student-satisfaction'

interface SatisfactionSurveyModalProps {
    isOpen: boolean
    onClose: () => void
    /** The tier being answered for. Null means nothing is due and nothing renders. */
    survey: DueSatisfactionSurvey | null
    /**
     * Called once the answers are saved, so the banner can retire itself
     * without waiting for a router refresh.
     */
    onSubmitted?: () => void
}

/**
 * The every-4-sessions satisfaction check-in.
 *
 * Opened from the dashboard banner rather than firing on load: the student is
 * usually mid-task, and an unclosable popup ambushing them is a worse way to
 * ask how they are finding the portal than a banner that waits. The banner is
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
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Quick check-in"
                className="relative bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-lg max-h-[92dvh] overflow-y-auto"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-6 right-6 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
                    aria-label="Close"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>

                {success ? (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-800">
                                Thanks — that goes straight to the Access Oxbridge team and
                                genuinely shapes what we build next.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3 bg-accent text-white font-bold rounded-2xl hover:opacity-95 transition-opacity"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                                <MessageSquareHeart className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-900">
                                    Quick check-in
                                </h2>
                                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                                    You&apos;re {survey.tier} sessions in — three questions, about
                                    thirty seconds.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                                    className="block text-sm font-semibold text-gray-700 mb-2"
                                >
                                    Anything you&apos;d like to add?{' '}
                                    <span className="font-normal text-gray-400">(optional)</span>
                                </label>
                                <textarea
                                    id="satisfaction-comment"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Anything working well, or anything we should fix?"
                                    rows={3}
                                    maxLength={SURVEY_COMMENT_MAX_LENGTH}
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 font-medium" role="alert">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-accent text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60"
                            >
                                <Send className="w-4 h-4" />
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
            <p className="text-sm font-semibold text-gray-800 mb-3">{question.label}</p>
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
                            className={`py-3 rounded-2xl text-base font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                                selected
                                    ? 'bg-accent text-white border-accent'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {option}
                        </button>
                    )
                })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium">
                <span>{question.lowLabel}</span>
                <span>{question.highLabel}</span>
            </div>
        </div>
    )
}
