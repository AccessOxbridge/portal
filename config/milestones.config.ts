/**
 * Configuration for the session-count milestone celebration.
 *
 * When a student's completed-session count reaches one of MILESTONES, the
 * dashboard shows a short congratulations with confetti, exactly once. Seen
 * milestones are recorded in `student_session_milestones`.
 */

/** The counts worth celebrating. Must stay sorted ascending. */
export const MILESTONES = [1, 5, 10, 20, 50, 100] as const

export type Milestone = (typeof MILESTONES)[number]

/**
 * Milestones crossed before this instant are never celebrated.
 *
 * When this shipped, students already had history: one was past 20 completed
 * sessions. Without a cutoff, every one of them would be congratulated on
 * their next login for work finished months ago, which reads as a bug rather
 * than a moment. The rule is therefore: we only celebrate a milestone when the
 * session that crossed it happened from go-live onwards.
 *
 * This is why no backfill rows are needed in `student_session_milestones`. The
 * student already past 20 simply gets nothing until their 50th session.
 *
 * Deliberately the same instant as FEEDBACK_PROMPT_CUTOFF, so both post-session
 * surfaces treat the same date as "when we started asking".
 */
export const MILESTONE_CUTOFF = '2026-08-31T00:00:00.000Z'

/**
 * The cutoff actually applied, with a development-only escape hatch.
 *
 * Testing this feature against a real account is otherwise close to
 * impossible: every existing student crossed their milestones before go-live,
 * which is the entire point of the cutoff, so nobody qualifies. The honest
 * alternative would be inventing completed sessions in the database, which is
 * far worse than a config override.
 *
 * Set MILESTONE_CUTOFF_OVERRIDE in .env.local to an earlier ISO instant to make
 * an existing student's past milestone qualify. Ignored in production builds,
 * so it cannot change what real students see.
 */
export function milestoneCutoff(): string {
    if (process.env.NODE_ENV !== 'production' && process.env.MILESTONE_CUTOFF_OVERRIDE) {
        return process.env.MILESTONE_CUTOFF_OVERRIDE
    }
    return MILESTONE_CUTOFF
}

export interface MilestoneCopy {
    /** Big line at the top of the card. */
    title: string
    /** One or two sentences under it. */
    body: string
    /** Sits in the badge above the title. */
    badge: string
}

/**
 * The congratulations text, per milestone.
 *
 * Written to be warm and brief. It is a moment, not a page: the student is
 * usually on their way somewhere else in the dashboard, and anything longer
 * than two sentences turns a reward into an interruption.
 */
export const MILESTONE_COPY: Record<Milestone, MilestoneCopy> = {
    1: {
        badge: 'First session',
        title: 'You are off the mark',
        body: 'Starting is the hardest part and it is already behind you. Your mentor is looking forward to the next one.',
    },
    5: {
        badge: '5 sessions',
        title: 'Five sessions in',
        body: 'Five sessions is where preparation stops being a plan and starts being a habit. Really good going.',
    },
    10: {
        badge: '10 sessions',
        title: 'Double figures',
        body: 'Ten sessions of focused work behind you. That consistency is exactly what strong applications are built on.',
    },
    20: {
        badge: '20 sessions',
        title: 'Twenty sessions',
        body: 'Twenty sessions is a serious body of work. Very few students put in this much, and it shows.',
    },
    50: {
        badge: '50 sessions',
        title: 'Fifty sessions',
        body: 'Fifty sessions with your mentors. This is the level of commitment we talk about when we talk about standout candidates.',
    },
    100: {
        badge: '100 sessions',
        title: 'One hundred sessions',
        body: 'One hundred sessions. That is a rare amount of dedication, and the whole Access Oxbridge team has noticed.',
    },
}

/**
 * The highest milestone at or below a count, or null below the first one.
 *
 * Deliberately not an exact-match check. Sessions are marked completed in
 * batches often enough that a student can go from 4 to 7 in one admin pass, and
 * an exact-match rule would silently swallow their 5th-session moment. Taking
 * the highest one passed means they still get it, once, and the cutoff check on
 * the crossing session is what keeps it honest.
 */
export function highestMilestoneAtOrBelow(completedSessions: number): Milestone | null {
    let found: Milestone | null = null
    for (const m of MILESTONES) {
        if (m <= completedSessions) found = m
    }
    return found
}
