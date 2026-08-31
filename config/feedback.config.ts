/**
 * Configuration for the post-session "rate your mentor" popup.
 */

/**
 * Sessions scheduled before this instant are never popped up.
 *
 * When this feature shipped there was a large backlog of unrated completed
 * sessions — one student alone had 22 — because the only prompt until now was a
 * link nobody clicked. Without a cutoff, every one of those students would be
 * ambushed on their next login. The rule is therefore: we only ask about
 * sessions that happen from go-live onwards.
 *
 * Older sessions stay rateable from the sessions list; they are simply never
 * volunteered. Move this date backwards if you ever decide to chase history.
 */
export const FEEDBACK_PROMPT_CUTOFF = '2026-08-31T00:00:00.000Z'

/**
 * How recent a session must be to be worth asking about. Past a week the
 * student's memory of the session is thin and the rating is noise.
 */
export const FEEDBACK_PROMPT_WINDOW_DAYS = 7

/** Start of the prompt window: the later of the cutoff and `now - 7 days`. */
export function feedbackPromptWindowStart(now: Date = new Date()): string {
    const windowStart = new Date(now.getTime() - FEEDBACK_PROMPT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const cutoff = new Date(FEEDBACK_PROMPT_CUTOFF)
    return (windowStart > cutoff ? windowStart : cutoff).toISOString()
}

/**
 * One-tap reasons offered only when a student rates 1–3 stars.
 *
 * Happy students pay no extra friction — they see stars and a comment box and
 * nothing else. When something went wrong, though, a free-text box alone tends
 * to produce either silence or a paragraph that is hard to act on, so we offer
 * concrete, mentor-actionable reasons instead. Selected tags are stored on
 * `form_responses.responses.tags`.
 */
export const LOW_RATING_TAGS = [
    'Started late',
    'Hard to follow',
    'Not enough preparation',
    'Wrong material covered',
    'Too fast',
    'Too slow',
    'Technical problems',
] as const

/** A rating at or below this reveals the tag chips. */
export const LOW_RATING_THRESHOLD = 3
