'use client'

import { useState } from 'react'
import { Star, PaperPlaneRight as Send, CheckCircle as CheckCircle2 } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import { LOW_RATING_TAGS, LOW_RATING_THRESHOLD } from '@/config/feedback.config'
import { buttonVariants } from '@/components/ui/button'
import { fieldBase } from '@/components/ui/input'
import { cn } from '@/utils/lib'

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
            <div className="space-y-4 p-6">
                <div role="status" className="flex items-start gap-3 rounded-card bg-tint-green p-4">
                    <CheckCircle2 weight="fill" className="mt-0.5 size-5 shrink-0 text-success" />
                    <p className="text-sm text-tint-green-foreground text-pretty">
                        Thanks! Your feedback has been shared with the Access Oxbridge team.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={successCta.onClick}
                    className={cn(buttonVariants(), 'w-full')}
                >
                    {successCta.label}
                </button>
            </div>
        )
    }

    return (
        <>
            <div className="flex items-center gap-3.5 px-6 pt-6 pe-16 pb-2">
                {mentorPhotoUrl ? (
                    // Plain <img> rather than next/image: no remotePatterns are
                    // configured for the Supabase storage host, and the rest of
                    // the dashboard renders avatars the same way (see sidebar).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={mentorPhotoUrl}
                        alt=""
                        className="size-12 shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10"
                    />
                ) : (
                    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-tint-amber text-tint-amber-foreground">
                        <Star weight="fill" className="size-6" />
                    </div>
                )}
                <div>
                    <h2 className="text-lg font-semibold text-foreground">How was your session?</h2>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                        With {mentorName}
                        {sessionDate ? ` on ${sessionDate}` : ''}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <div>
                    <div
                        className="flex items-center justify-center gap-1"
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
                                aria-label={`${value} star${value > 1 ? 's' : ''}, ${RATING_LABELS[value]}`}
                                onClick={() => {
                                    setRating(value)
                                    setError(null)
                                }}
                                onMouseEnter={() => setHovered(value)}
                                onFocus={() => setHovered(value)}
                                onBlur={() => setHovered(0)}
                                className="rounded-full p-1.5 outline-none transition-transform duration-150 ease-out active:scale-[0.85] focus-visible:ring-[3px] focus-visible:ring-ring/40"
                            >
                                <Star
                                    weight="fill"
                                    className={`size-10 transition-[color,scale] duration-150 ease-out ${
                                        value <= activeRating
                                            ? 'scale-110 text-amber-400'
                                            : 'text-muted-foreground/25'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 h-5 text-center text-sm font-medium text-muted-foreground" aria-live="polite">
                        {activeRating ? RATING_LABELS[activeRating] : ''}
                    </p>
                </div>

                {/* Only for 1–3 stars: concrete, actionable reasons. */}
                {showTags && (
                    <div>
                        <p className="mb-2 text-sm font-medium text-foreground">
                            What went wrong?{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
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
                                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-[background-color,color,border-color,scale] duration-150 ease-out active:scale-[0.96] ${
                                            selected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-input bg-card text-foreground hover:bg-muted'
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
                        className="mb-2 block text-sm font-medium text-foreground"
                    >
                        Anything you&apos;d like to add?{' '}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                        id="session-rating-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="What went well? What could be better?"
                        rows={3}
                        maxLength={2000}
                        className={cn(fieldBase, 'resize-none px-3.5 py-2.5 leading-relaxed')}
                    />
                </div>

                {error && (
                    <p className="text-sm text-destructive" role="alert">
                        {error}
                    </p>
                )}

                <div className="space-y-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(buttonVariants(), 'w-full')}
                    >
                        <Send weight="fill" />
                        {loading ? 'Sending…' : 'Submit feedback'}
                    </button>
                    {secondaryAction && (
                        <button
                            type="button"
                            onClick={secondaryAction.onClick}
                            className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            </form>
        </>
    )
}
