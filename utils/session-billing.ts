// When a session counts as delivered: charged to the student and invoiceable
// by the mentor.
//
// The rule is real Zoom minutes, not the booking. A mentor and student who open
// the room for a minute and agree to meet later have not had a session, even
// though Zoom still sends meeting.ended for it.

/** Sessions shorter than this are not charged and cannot be invoiced. */
export const MIN_BILLABLE_MINUTES = 15

/** Meeting time this long before the scheduled start still counts. */
const WINDOW_BEFORE_MS = 30 * 60_000
/** Meeting time this long after the scheduled end still counts. */
const WINDOW_AFTER_MS = 2 * 60 * 60_000

export interface ZoomInstance {
    start: string | null
    end: string | null
    /** Real length of this instance. NULL when the payload had no usable times. */
    minutes: number | null
    /** The part of `minutes` that fell inside the session window. */
    counted_minutes: number | null
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
 * Only time inside the session window counts, so a meeting reopened the next
 * day from an old link adds nothing, while a mentor who opens the room early
 * still gets the whole session counted.
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
        return { start: startTime ?? null, end: endTime ?? null, minutes: null, counted_minutes: null }
    }

    const toMinutes = (ms: number) => Math.round(ms / 60_000)
    const minutes = toMinutes(end.getTime() - start.getTime())

    let countedMinutes = minutes
    const scheduled = scheduledAt ? new Date(scheduledAt) : null
    if (scheduled && !isNaN(scheduled.getTime())) {
        const windowStart = scheduled.getTime() - WINDOW_BEFORE_MS
        const windowEnd = scheduled.getTime() + (durationMinutes ?? 60) * 60_000 + WINDOW_AFTER_MS
        const overlap = Math.min(end.getTime(), windowEnd) - Math.max(start.getTime(), windowStart)
        countedMinutes = toMinutes(Math.max(0, overlap))
    }

    return { start: start.toISOString(), end: end.toISOString(), minutes, counted_minutes: countedMinutes }
}

/**
 * Total counted minutes, or NULL when no instance has a known length.
 * A meeting only ever opened on the wrong day comes out as 0, not unknown.
 */
export function sumCountedMinutes(instances: ZoomInstances): number | null {
    const known = Object.values(instances).filter(i => i.counted_minutes != null)
    if (known.length === 0) return null
    return known.reduce((sum, i) => sum + (i.counted_minutes as number), 0)
}
