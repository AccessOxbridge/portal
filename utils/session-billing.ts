// When a session counts as delivered: charged to the student and invoiceable
// by the mentor.
//
// The rule is real Zoom minutes, not the booking. A mentor and student who open
// the room for a minute and agree to meet later have not had a session, even
// though Zoom still sends meeting.ended for it.

/** Sessions shorter than this are not charged and cannot be invoiced. */
export const MIN_BILLABLE_MINUTES = 15

/** Instances that start this long before the scheduled start still count. */
const WINDOW_BEFORE_MS = 30 * 60_000
/** Instances that start this long after the scheduled end no longer count. */
const WINDOW_AFTER_MS = 2 * 60 * 60_000

export interface ZoomInstance {
    start: string | null
    end: string | null
    minutes: number | null
    counted: boolean
}

export type ZoomInstances = Record<string, ZoomInstance>

/**
 * NULL means the length is unknown (sessions from before this was recorded,
 * or a webhook without times). Unknown stays billable, exactly as before.
 */
export function isBillableLength(actualMinutes: number | null | undefined): boolean {
    return actualMinutes == null || actualMinutes >= MIN_BILLABLE_MINUTES
}

/**
 * Build the record for one meeting instance from a meeting.ended payload.
 * Only instances that start inside the session window count, so a meeting
 * reopened the next day from an old link adds nothing.
 */
export function buildInstance(
    startTime: string | null | undefined,
    endTime: string | null | undefined,
    scheduledAt: string | null | undefined,
    durationMinutes: number | null | undefined
): ZoomInstance {
    const start = startTime ? new Date(startTime) : null
    const end = endTime ? new Date(endTime) : null
    const valid = !!start && !!end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start
    if (!valid) {
        return { start: startTime ?? null, end: endTime ?? null, minutes: null, counted: false }
    }

    const minutes = Math.round((end.getTime() - start.getTime()) / 60_000)

    let counted = true
    const scheduled = scheduledAt ? new Date(scheduledAt) : null
    if (scheduled && !isNaN(scheduled.getTime())) {
        const windowStart = scheduled.getTime() - WINDOW_BEFORE_MS
        const windowEnd = scheduled.getTime() + (durationMinutes ?? 60) * 60_000 + WINDOW_AFTER_MS
        counted = start.getTime() >= windowStart && start.getTime() <= windowEnd
    }

    return { start: start.toISOString(), end: end.toISOString(), minutes, counted }
}

/**
 * Total counted minutes, or NULL when no instance has a known length.
 * Instances outside the window have a known length but add 0, so a meeting
 * only ever opened on the wrong day comes out as 0, not unknown.
 */
export function sumCountedMinutes(instances: ZoomInstances): number | null {
    const known = Object.values(instances).filter(i => i.minutes != null)
    if (known.length === 0) return null
    return known.reduce((sum, i) => sum + (i.counted ? (i.minutes as number) : 0), 0)
}
