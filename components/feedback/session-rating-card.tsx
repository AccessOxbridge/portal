'use client'

import { useState } from 'react'
import { Star, Send, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { LOW_RATING_TAGS, LOW_RATING_THRESHOLD } from '@/config/feedback.config'

/**
 * The post-session rating form: stars, optional reasons when something went
 * wrong, optional comment.
 *
 * Shared deliberately between the dashboard popup (rate-session-modal) and the
 * full page at /dashboard/student/sessions/[id]/feedback, so the two can never
 * drift apart — they are the same two questions and should look identical.
 * Callers supply only the surrounding chrome.
 */

export interface SessionRatingCardProps {
    sessionId: string
    mentorName: string
    mentorPhotoUrl?: string | null
    /** ISO timestamp of the session, shown in the subtitle. */
    scheduledAt?: string | null
    /** Rendered under the submit button, e.g. the modal's "Not now". */
    secondaryAction?: { label: string; onClick: () => void }
    /**
     * Called the moment feedback saves. Supply this to navigate away instead of
     * showing a confirmation panel — the page does, since the student is
     * finished and a second button to press adds nothing.
     */
    onSubmitted?: () => void
    /**
     * Confirmation button shown after saving, when `onSubmitted` is not given.
     * The popup uses this: it has nowhere to navigate to.
     */
    successCta?: { label: string; onClick: () => void }
}

const RATING_LABELS: Record<number, string> = {
    1: 'Poor',
    2: 'Below average',
    3: 'Good',
    4: 'Great',
    5: 'Excellent',
}

export default function SessionRatingCard({
    sessionId,
    mentorName,
    mentorPhotoUrl = null,
    scheduledAt = null,
    secondaryAction,
    onSubmitted,
    successCta,
}: SessionRatingCardProps) {
    const [rating, setRating] = useState(0)
    const [hovered, setHovered] = useState(0)
    const [tags, setTags] = useState<string[]>([])
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const supabase = createClient()

    const sessionDate = scheduledAt
        ? new Date(scheduledAt).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
          })
        : null

    const activeRating = hovered || rating
    const showTags = rating > 0 && rating <= LOW_RATING_THRESHOLD

    const toggleTag = (tag: string) =>
        setTags((current) =>
            current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
        )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating < 1) {
            setError('Please pick a rating first.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const trimmed = comment.trim()
            // Tags only make sense alongside the rating that revealed them, so
            // drop them if the student raised their score after picking some.
            const keptTags = showTags ? tags : []

            // The star goes in two places on purpose: `rating` is the indexed
            // column the mentor aggregates average, `responses.mentor_rating`
            // is what the admin feedback table reads.
            const { error: insertError } = await supabase.from('form_responses').insert({
                session_id: sessionId,
                form_type: 'student_feedback',
                respondent_id: user.id,
                rating,
                responses: {
                    mentor_rating: rating,
                    ...(keptTags.length > 0 ? { tags: keptTags } : {}),
                    ...(trimmed ? { experience: trimmed } : {}),
                },
            })

            if (insertError) throw insertError

            if (onSubmitted) {
                // Deliberately leave `loading` set: navigation is in flight and
                // re-enabling the button here would allow a second insert.
                onSubmitted()
                return
            }
            setSuccess(true)
            setLoading(false)
        } catch (err) {
            console.error('Failed to submit session rating:', err)
            setError('Could not save your rating. Please try again.')
            setLoading(false)
        }
    }

    if (success && successCta) {
        return (
            <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-800">
                        Thanks — your feedback has been shared with the Access Oxbridge team.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={successCta.onClick}
                    className="w-full py-3 bg-accent text-white font-bold rounded-2xl hover:opacity-95 transition-opacity"
                >
                    {successCta.label}
                </button>
            </div>
        )
    }

    return (
        <>
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                {mentorPhotoUrl ? (
                    // Plain <img> rather than next/image: no remotePatterns are
                    // configured for the Supabase storage host, and the rest of
                    // the dashboard renders avatars the same way (see sidebar).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={mentorPhotoUrl}
                        alt=""
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                ) : (
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 text-amber-600" />
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900">How was your session?</h2>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                        With {mentorName}
                        {sessionDate ? ` on ${sessionDate}` : ''}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                    <div
                        className="flex items-center justify-center gap-2"
                        role="radiogroup"
                        aria-label="Rate your mentor from 1 to 5 stars"
                        onMouseLeave={() => setHovered(0)}
                    >
                        {[1, 2, 3, 4, 5].map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={rating === value}
                                aria-label={`${value} star${value > 1 ? 's' : ''} — ${RATING_LABELS[value]}`}
                                onClick={() => {
                                    setRating(value)
                                    setError(null)
                                }}
                                onMouseEnter={() => setHovered(value)}
                                onFocus={() => setHovered(value)}
                                onBlur={() => setHovered(0)}
                                className="p-1 rounded-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <Star
                                    className={`w-10 h-10 transition-colors ${
                                        value <= activeRating
                                            ? 'text-amber-400 fill-amber-400'
                                            : 'text-gray-200 fill-gray-200'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                    <p className="text-center text-sm font-semibold text-gray-600 mt-3 h-5">
                        {activeRating ? RATING_LABELS[activeRating] : ''}
                    </p>
                </div>

                {/* Only for 1–3 stars: concrete, actionable reasons. */}
                {showTags && (
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            What went wrong?{' '}
                            <span className="font-normal text-gray-400">(optional)</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {LOW_RATING_TAGS.map((tag) => {
                                const selected = tags.includes(tag)
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                            selected
                                                ? 'bg-accent text-white border-accent'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <label
                        htmlFor="session-rating-comment"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                        Anything you&apos;d like to add?{' '}
                        <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                        id="session-rating-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="What went well? What could be better?"
                        rows={3}
                        maxLength={2000}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-600 font-medium" role="alert">
                        {error}
                    </p>
                )}

                <div className="space-y-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-accent text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60"
                    >
                        <Send className="w-4 h-4" />
                        {loading ? 'Sending…' : 'Submit feedback'}
                    </button>
                    {secondaryAction && (
                        <button
                            type="button"
                            onClick={secondaryAction.onClick}
                            className="w-full py-3 text-gray-500 font-semibold rounded-2xl hover:bg-gray-50 transition-colors"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            </form>
        </>
    )
}
