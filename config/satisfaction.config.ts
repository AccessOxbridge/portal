/**
 * Configuration for the every-4-sessions student satisfaction check-in.
 *
 * Every 4 completed sessions a banner pins to the top of the student
 * dashboard. Clicking it opens a modal with three 1-5 questions and an
 * optional comment. Answers go to `student_satisfaction_surveys`, and the row
 * for the current tier is what retires the banner.
 */

/**
 * How many completed sessions between check-ins.
 *
 * Four is short enough to catch a mentoring relationship going wrong before
 * the student quietly disengages, and long enough that nobody is asked twice
 * in a fortnight. Changing this is safe: every row records the tier it
 * answered for, so old responses stay interpretable at the old interval.
 */
export const SURVEY_INTERVAL_SESSIONS = 4

/**
 * The tier a student is currently due, or null below the first one.
 *
 * Rounds *down* to the nearest interval rather than matching exactly. Sessions
 * are marked completed in batches often enough that a student can go from 3 to
 * 6 in one admin pass, and an exact-match rule would silently skip their
 * 4-session check-in until session 8. Rounding down means they are still asked,
 * once, and the tier recorded is the one they actually crossed.
 */
export function dueSurveyTier(completedSessions: number): number | null {
    const tier = Math.floor(completedSessions / SURVEY_INTERVAL_SESSIONS) * SURVEY_INTERVAL_SESSIONS
    return tier >= SURVEY_INTERVAL_SESSIONS ? tier : null
}

/**
 * Deliberately no go-live cutoff, unlike MILESTONE_CUTOFF in
 * milestones.config.ts.
 *
 * The milestone popup needs one because congratulating a student for their
 * 20th session months after the fact reads as a bug. A satisfaction question
 * has no such problem — the students who already have a long history are
 * precisely the ones worth asking on day one. Eight students qualified when
 * this shipped; each is asked once at their current tier, then follows the
 * normal cadence.
 */

export interface SurveyQuestion {
    /** Stored as the column name on `student_satisfaction_surveys`. */
    key: 'portal_rating' | 'mentoring_rating' | 'progress_rating'
    /** The question itself. */
    label: string
    /** Sits under the 1 chip. */
    lowLabel: string
    /** Sits under the 5 chip. */
    highLabel: string
}

/**
 * The three questions, in order.
 *
 * All three are 1-5 on purpose. A mix of scales and yes/no answers would read
 * as a form; three identical rows of chips read as one gesture, and the whole
 * thing is three taps. The wording is second person and plain — students are
 * 16-18 and will not parse "satisfaction with the platform".
 */
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
    {
        key: 'portal_rating',
        label: 'How are you finding your experience on the portal?',
        lowLabel: 'Frustrating',
        highLabel: 'Excellent',
    },
    {
        key: 'mentoring_rating',
        label: 'How have you found your mentoring sessions?',
        lowLabel: 'Not useful',
        highLabel: 'Excellent',
    },
    {
        key: 'progress_rating',
        label: "Do you feel like you're making progress?",
        lowLabel: 'Not really',
        highLabel: 'Definitely',
    },
]

/** Longest comment we will store. Matches the session feedback box. */
export const SURVEY_COMMENT_MAX_LENGTH = 2000
