/**
 * Configuration for the mentor post-session check-in popup.
 *
 * Deliberately mirrors config/feedback.config.ts, which does the same job for
 * the student rating popup. Keep the two in step unless there is a reason not
 * to — a mentor and their student should stop being nudged about the same
 * session at roughly the same time.
 */

/**
 * Sessions scheduled before this instant are never popped up.
 *
 * Without a cutoff, every mentor with a backlog of completed sessions would be
 * asked about their whole history on their next login. The rule is: we only ask
 * about sessions that complete from go-live onwards. Move this date backwards
 * only if you decide to chase history.
 */
export const MENTOR_CHECKIN_CUTOFF = '2026-08-31T00:00:00.000Z'

/**
 * How recent a session must be to be worth asking about. Past a week the
 * homework either happened or the moment has gone, and the answer is noise.
 */
export const MENTOR_CHECKIN_WINDOW_DAYS = 7

/** Start of the prompt window: the later of the cutoff and `now - 7 days`. */
export function mentorCheckinWindowStart(now: Date = new Date()): string {
    const windowStart = new Date(now.getTime() - MENTOR_CHECKIN_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const cutoff = new Date(MENTOR_CHECKIN_CUTOFF)
    return (windowStart > cutoff ? windowStart : cutoff).toISOString()
}
