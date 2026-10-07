/**
 * Session frequency tracking: is a student keeping up with the pace an admin
 * set for them?
 *
 * Pure functions only, no Supabase. The Performance dashboard, the target
 * modal's live preview, and (later) the weekly behind-pace email all share
 * this so the three can never disagree about who is behind.
 *
 * A target is three numbers plus a kind (see the migration
 * 20261007120000_student_session_targets.sql):
 *   package  `sessions` in total over `weeks` from `startDate`
 *   ongoing  `sessions` every `weeks`, no end (pay-as-you-go students)
 *
 * Only sessions with status 'completed' count. A session becomes completed
 * when Zoom reports the meeting ended, so a past session still 'active' is
 * either a no-show or a missed webhook; callers surface those separately as
 * "unconfirmed" rather than guessing.
 */

export type PlanType = 'package' | 'ongoing'

export interface SessionTarget {
    planType: PlanType
    sessions: number
    weeks: number
    /** YYYY-MM-DD, read as midnight UTC. */
    startDate: string
}

export type PaceStatus =
    | 'behind'
    | 'slipping'
    | 'on_track'
    | 'complete'
    | 'not_started'
    | 'no_target'

export interface PaceResult {
    status: PaceStatus
    /** Whole sessions that should be done by now within the judged window. */
    expected: number | null
    /** Completed sessions within the judged window. */
    completed: number
    /** expected - completed, never negative. */
    shortBy: number
    /** Days since the last completed session (or since the start, if none since). */
    daysSinceLast: number | null
    /** One session is due every this many days. */
    intervalDays: number | null
    /** Human description of what was judged, e.g. "since 1 Sep" or "last 4 weeks". */
    windowLabel: string | null
    /** Why the status is what it is, most important first. Empty when on track. */
    reasons: string[]
}

/** Ongoing plans are judged on this many recent weeks. */
export const ONGOING_WINDOW_WEEKS = 4

/** Red when the gap since the last session reaches this many intervals (1/week, 14 days). */
const BEHIND_GAP_INTERVALS = 2
/** Amber when the gap reaches this many intervals. */
const SLIPPING_GAP_INTERVALS = 1.5
/** Red when this many whole sessions short of the expected count. */
const BEHIND_SHORT_BY = 2

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export const PLAN_TYPES: PlanType[] = ['package', 'ongoing']

export function isPlanType(value: unknown): value is PlanType {
    return value === 'package' || value === 'ongoing'
}

function trimNumber(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

function plural(n: number, word: string): string {
    return `${trimNumber(n)} ${word}${n === 1 ? '' : 's'}`
}

/**
 * "1 session per week", "2 sessions per week", "1 every 2.5 weeks".
 * Rounds to one decimal place, which is plenty for a person reading it.
 */
export function describePace(sessions: number, weeks: number): string {
    if (!(sessions > 0) || !(weeks > 0)) return ''
    const perWeek = sessions / weeks
    if (perWeek >= 1) {
        const rounded = Math.round(perWeek * 10) / 10
        return `${plural(rounded, 'session')} per week`
    }
    const every = Math.round((weeks / sessions) * 10) / 10
    return `1 session every ${plural(every, 'week')}`
}

/** "70 over 70 weeks · 1 session per week" or "2 every week · 2 sessions per week (ongoing)". */
export function describeTarget(target: Pick<SessionTarget, 'planType' | 'sessions' | 'weeks'>): string {
    const pace = describePace(target.sessions, target.weeks)
    if (target.planType === 'ongoing') {
        return `Ongoing · ${pace}`
    }
    return `${target.sessions} over ${plural(target.weeks, 'week')} · ${pace}`
}

export function parseStartDate(startDate: string): Date {
    return new Date(`${startDate}T00:00:00Z`)
}

/** End of a package plan, or null for ongoing. */
export function targetEndDate(target: SessionTarget): Date | null {
    if (target.planType !== 'package') return null
    return new Date(parseStartDate(target.startDate).getTime() + target.weeks * WEEK_MS)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatShortDate(d: Date): string {
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/**
 * Judge a student against their target.
 *
 * Red ('behind') when either:
 *   - no completed session for 2 intervals or more (a 1/week student with
 *     nothing in 2 weeks), or
 *   - 2 or more whole sessions short of where they should be by now.
 * Amber ('slipping') when 1 session short, or the gap is past 1.5 intervals.
 *
 * Package plans count everything since the start date. Ongoing plans count
 * the last ONGOING_WINDOW_WEEKS weeks only, so they recover once the student
 * gets back into rhythm.
 */
export function evaluatePace(
    target: SessionTarget | null,
    completedAt: Date[],
    now: Date = new Date()
): PaceResult {
    const lastCompleted = completedAt.reduce<Date | null>(
        (latest, d) => (!latest || d > latest ? d : latest),
        null
    )

    if (!target) {
        return {
            status: 'no_target',
            expected: null,
            completed: completedAt.length,
            shortBy: 0,
            daysSinceLast: lastCompleted ? Math.floor((now.getTime() - lastCompleted.getTime()) / DAY_MS) : null,
            intervalDays: null,
            windowLabel: 'all time',
            reasons: [],
        }
    }

    const start = parseStartDate(target.startDate)
    const intervalDays = (target.weeks * 7) / target.sessions
    const pacePerWeek = target.sessions / target.weeks

    if (now < start) {
        return {
            status: 'not_started',
            expected: 0,
            completed: 0,
            shortBy: 0,
            daysSinceLast: null,
            intervalDays,
            windowLabel: `starts ${formatShortDate(start)}`,
            reasons: [],
        }
    }

    const elapsedWeeks = (now.getTime() - start.getTime()) / WEEK_MS

    let windowStart: Date
    let expectedRaw: number
    let windowLabel: string
    if (target.planType === 'package') {
        windowStart = start
        expectedRaw = Math.min(target.sessions, pacePerWeek * elapsedWeeks)
        windowLabel = `since ${formatShortDate(start)}`
    } else {
        const windowWeeks = Math.min(ONGOING_WINDOW_WEEKS, elapsedWeeks)
        windowStart = new Date(now.getTime() - windowWeeks * WEEK_MS)
        expectedRaw = pacePerWeek * windowWeeks
        windowLabel =
            windowWeeks < ONGOING_WINDOW_WEEKS
                ? `since ${formatShortDate(start)}`
                : `last ${ONGOING_WINDOW_WEEKS} weeks`
    }

    // A session is only "due" once its whole interval has passed, so a
    // student three days into a 1/week plan is not one short.
    const expected = Math.floor(expectedRaw + 1e-9)
    const completed = completedAt.filter((d) => d >= windowStart && d <= now).length
    const shortBy = Math.max(0, expected - completed)

    // The gap clock starts at the plan start if nothing has been done since.
    const gapFrom = lastCompleted && lastCompleted > start ? lastCompleted : start
    const daysSinceLast = Math.floor((now.getTime() - gapFrom.getTime()) / DAY_MS)

    const base = { expected, completed, shortBy, daysSinceLast, intervalDays, windowLabel }

    if (target.planType === 'package' && completed >= target.sessions) {
        return { ...base, status: 'complete', reasons: [] }
    }

    const reasons: string[] = []
    const intervalText =
        intervalDays >= 7 ? `every ${plural(Math.round((intervalDays / 7) * 10) / 10, 'week')}` : `every ${plural(Math.round(intervalDays * 10) / 10, 'day')}`
    const gapBehind = daysSinceLast >= intervalDays * BEHIND_GAP_INTERVALS
    const gapSlipping = daysSinceLast >= intervalDays * SLIPPING_GAP_INTERVALS
    const sinceText = lastCompleted && lastCompleted > start ? 'since last session' : 'since plan start'

    if (shortBy > 0) {
        reasons.push(`${plural(shortBy, 'session')} behind pace (${completed} of ${expected} ${windowLabel})`)
    }
    if (gapSlipping) {
        reasons.push(`${plural(daysSinceLast, 'day')} ${sinceText}, expected ${intervalText}`)
    }

    let status: PaceStatus = 'on_track'
    if (gapBehind || shortBy >= BEHIND_SHORT_BY) {
        status = 'behind'
    } else if (gapSlipping || shortBy >= 1) {
        status = 'slipping'
    }

    return { ...base, status, reasons }
}

export const MAX_TARGET_SESSIONS = 1000
export const MAX_TARGET_WEEKS = 520
export const MAX_TARGET_NOTE = 500
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface TargetInput {
    planType: unknown
    sessions: unknown
    weeks: unknown
    startDate: unknown
    note?: unknown
}

/**
 * Server-side validation for a target, shared by the create-account action
 * and the dashboard's set-target action. Mirrors the CHECK constraints in the
 * migration so a bad value is a friendly message, not a Postgres error.
 */
export function validateTargetInput(
    input: TargetInput
): { error: string } | { target: SessionTarget; note: string | null } {
    if (!isPlanType(input.planType)) {
        return { error: 'Choose a package or an ongoing plan' }
    }
    const sessions = Number(String(input.sessions ?? '').trim())
    if (!Number.isInteger(sessions) || sessions < 1 || sessions > MAX_TARGET_SESSIONS) {
        return { error: `Sessions must be a whole number between 1 and ${MAX_TARGET_SESSIONS}` }
    }
    const weeks = Number(String(input.weeks ?? '').trim())
    if (!Number.isFinite(weeks) || weeks <= 0 || weeks > MAX_TARGET_WEEKS) {
        return { error: `Weeks must be more than 0 and at most ${MAX_TARGET_WEEKS}` }
    }
    // NUMERIC(6, 2) in the table.
    const weeksRounded = Math.round(weeks * 100) / 100
    const startDate = String(input.startDate ?? '').trim()
    if (!DATE_RE.test(startDate) || Number.isNaN(parseStartDate(startDate).getTime())) {
        return { error: 'Start date is required' }
    }
    const noteRaw = String(input.note ?? '').trim()
    if (noteRaw.length > MAX_TARGET_NOTE) {
        return { error: `Note must be ${MAX_TARGET_NOTE} characters or fewer` }
    }
    return {
        target: { planType: input.planType, sessions, weeks: weeksRounded, startDate },
        note: noteRaw || null,
    }
}

/** Sort order for the dashboard: worst first. */
export const PACE_STATUS_ORDER: Record<PaceStatus, number> = {
    behind: 0,
    slipping: 1,
    no_target: 2,
    on_track: 3,
    not_started: 4,
    complete: 5,
}

export const PACE_STATUS_LABEL: Record<PaceStatus, string> = {
    behind: 'Behind',
    slipping: 'Slipping',
    on_track: 'On track',
    complete: 'Package complete',
    not_started: 'Not started',
    no_target: 'No target',
}

// ------------------------------------------------------------------
// Mentor ratings
// ------------------------------------------------------------------

/** Flag a mentor whose average falls below this, or who got any rating below it recently. */
export const MENTOR_FLAG_THRESHOLD = 3
export const MENTOR_RECENT_DAYS = 30

export interface MentorRatingInput {
    rating: number
    submittedAt: Date
}

export interface MentorRatingResult {
    average: number | null
    count: number
    lowestRecent: number | null
    recentCount: number
    lastRatedAt: Date | null
    flagged: boolean
    reasons: string[]
}

export function evaluateMentorRatings(ratings: MentorRatingInput[], now: Date = new Date()): MentorRatingResult {
    if (ratings.length === 0) {
        return {
            average: null,
            count: 0,
            lowestRecent: null,
            recentCount: 0,
            lastRatedAt: null,
            flagged: false,
            reasons: [],
        }
    }

    const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    const recentFrom = now.getTime() - MENTOR_RECENT_DAYS * DAY_MS
    const recent = ratings.filter((r) => r.submittedAt.getTime() >= recentFrom)
    const lowestRecent = recent.length > 0 ? Math.min(...recent.map((r) => r.rating)) : null
    const lastRatedAt = ratings.reduce<Date | null>(
        (latest, r) => (!latest || r.submittedAt > latest ? r.submittedAt : latest),
        null
    )

    const reasons: string[] = []
    if (average < MENTOR_FLAG_THRESHOLD) {
        reasons.push(`Average ${average.toFixed(1)} is below ${MENTOR_FLAG_THRESHOLD}`)
    }
    const recentLow = recent.filter((r) => r.rating < MENTOR_FLAG_THRESHOLD)
    if (recentLow.length > 0) {
        reasons.push(
            `${plural(recentLow.length, 'rating')} below ${MENTOR_FLAG_THRESHOLD} in the last ${MENTOR_RECENT_DAYS} days (lowest ${lowestRecent})`
        )
    }

    return {
        average,
        count: ratings.length,
        lowestRecent,
        recentCount: recent.length,
        lastRatedAt,
        flagged: reasons.length > 0,
        reasons,
    }
}
