/**
 * Zoom host pool — allocation.
 *
 * Decides which Zoom user should host a new meeting, given what is already
 * booked in that time window.
 *
 * THE NULL RULE, which matters more than anything else here:
 *
 *   Every session created before the host pool existed has
 *   `zoom_host_user_id = NULL`, and every one of those meetings was created via
 *   `POST /users/me/meetings` — which resolves to office@accessoxbridge.io.
 *   So NULL does not mean "no host", it means "office@".
 *
 *   Read NULL naively and the allocator concludes office@ is free during every
 *   legacy session, then books on top of one. The mentor clicks Start and Zoom
 *   refuses. That is the single worst bug available in this file, so the
 *   coalesce below is not a tidy-up — it is the point.
 */

import { createAdminClient } from './supabase/admin'
import {
    listPoolHosts,
    LEGACY_HOST_USER_ID,
    SLOTS_PER_HOST,
    type ZoomHost,
} from './zoom-hosts'

type AdminClient = ReturnType<typeof createAdminClient>

export interface HostAllocation {
    /**
     * The host to use. ALWAYS set — the emptiest host, even when every host is
     * already at capacity.
     *
     * This is deliberate. Refusing a booking is a product decision that belongs
     * to the caller, not here, and today's behaviour is to accept everything
     * and pile it onto office@. Returning the emptiest host is never worse than
     * that, so nothing this file does can block a booking that works today.
     * `atCapacity` is how a caller opts into refusing.
     */
    host: ZoomHost
    /** True when every host is full for this window and `host` is an overflow. */
    atCapacity: boolean
    /** Per-host occupancy in this window, for logging and diagnostics. */
    load: Array<{ email: string; id: string; used: number; free: number }>
    /** Total free slots across the pool in this window. */
    freeSlots: number
    /** Total capacity in this window (hosts x SLOTS_PER_HOST). */
    totalSlots: number
}

/**
 * Widen the lookup window so a long session starting earlier still overlaps.
 * 8 hours comfortably exceeds any realistic session length; the precise
 * overlap test below is what actually decides.
 */
const LOOKBACK_HOURS = 8

function endOf(startMs: number, durationMinutes: number | null): number {
    return startMs + (durationMinutes ?? 60) * 60 * 1000
}

/**
 * Choose a host for a session at `startTime` lasting `durationMinutes`.
 *
 * Throws if the pool cannot be discovered, or if existing sessions cannot be
 * read (fails closed — guessing who is busy is how you double-book someone).
 *
 * Always returns a host. When every host is full, `atCapacity` is true and the
 * host is the emptiest one — an overflow, not a refusal.
 */
export async function allocateHost(
    db: AdminClient,
    startTime: Date,
    durationMinutes: number
): Promise<HostAllocation> {
    const hosts = await listPoolHosts()

    const startMs = startTime.getTime()
    const endMs = endOf(startMs, durationMinutes)

    const windowStart = new Date(startMs - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
    const windowEnd = new Date(endMs).toISOString()

    // Coarse filter in SQL; the exact overlap test happens below.
    const { data: candidates, error } = await db
        .from('sessions')
        .select('id, scheduled_at, duration_minutes, zoom_host_user_id')
        .neq('status', 'cancelled')
        .not('scheduled_at', 'is', null)
        .gte('scheduled_at', windowStart)
        .lte('scheduled_at', windowEnd)

    if (error) {
        // Fail closed: we cannot know who is busy, so we must not guess.
        throw new Error(`[host-allocator] Could not load existing sessions: ${error.message}`)
    }

    const used = new Map<string, number>()
    for (const host of hosts) used.set(host.id, 0)

    for (const c of candidates || []) {
        const cStart = new Date(c.scheduled_at as string).getTime()
        if (Number.isNaN(cStart)) continue
        const cEnd = endOf(cStart, c.duration_minutes as number | null)

        // Half-open [start, end): a session ending exactly when another begins
        // does not overlap it.
        if (!(cStart < endMs && startMs < cEnd)) continue

        // THE NULL RULE — see the file header.
        const hostId = (c.zoom_host_user_id as string | null) ?? LEGACY_HOST_USER_ID

        // A session on a host no longer in the pool still occupies that host in
        // reality, but cannot be allocated against, so it is simply ignored.
        if (!used.has(hostId)) continue

        used.set(hostId, (used.get(hostId) ?? 0) + 1)
    }

    const load = hosts.map((h) => ({
        email: h.email,
        id: h.id,
        used: used.get(h.id) ?? 0,
        free: Math.max(0, SLOTS_PER_HOST - (used.get(h.id) ?? 0)),
    }))

    const freeSlots = load.reduce((sum, l) => sum + l.free, 0)
    const totalSlots = hosts.length * SLOTS_PER_HOST

    // Prefer the emptiest host, so load spreads rather than piling onto the
    // first one. Ties break on email for reproducible, testable decisions.
    const ranked = [...load].sort(
        (a, b) => a.used - b.used || a.email.localeCompare(b.email)
    )

    // ranked[0] always exists: listPoolHosts() throws rather than return empty.
    const chosen = hosts.find((h) => h.id === ranked[0].id) as ZoomHost

    return { host: chosen, atCapacity: freeSlots === 0, load, freeSlots, totalSlots }
}

/** One-line summary of an allocation decision, for shadow-mode logs. */
export function describeAllocation(a: HostAllocation, startTime: Date): string {
    const detail = a.load.map((l) => `${l.email}=${l.used}/${SLOTS_PER_HOST}`).join(' ')
    const verdict = a.atCapacity
        ? `-> ${a.host.email} (AT CAPACITY - overflow)`
        : `-> ${a.host.email}`
    return `[host-allocator] ${startTime.toISOString()} ${detail} free=${a.freeSlots}/${a.totalSlots} ${verdict}`
}

/**
 * Work out which host a booking should use, and log the decision.
 *
 * This is the only entry point the booking routes need. It encapsulates the
 * two safety properties of the host pool rollout:
 *
 *  1. SHADOW MODE. While `ZOOM_HOST_POOL_ENABLED` is not 'true', the allocator
 *     still runs and still logs, but the returned `hostUserId` is undefined —
 *     so `createZoomMeeting` falls back to `users/me` and behaviour is
 *     byte-identical to before the pool existed. This lets the allocator prove
 *     itself against real traffic at zero exposure.
 *
 *  2. NEVER BLOCKS A BOOKING. If discovery or the overlap query fails, we log
 *     loudly and return undefined rather than throwing. A booking that works
 *     today must not start failing because a new subsystem had a bad day.
 *     Refusing on capacity is a later, deliberate change.
 */
export async function resolveBookingHost(
    db: AdminClient,
    startTime: Date,
    durationMinutes: number,
    context: string
): Promise<{ hostUserId?: string; allocation?: HostAllocation }> {
    const { isHostPoolEnabled } = await import('./zoom-hosts')
    const enabled = isHostPoolEnabled()

    try {
        const allocation = await allocateHost(db, startTime, durationMinutes)
        const mode = enabled ? 'LIVE' : 'shadow'
        console.log(`${describeAllocation(allocation, startTime)} [${mode}] (${context})`)

        if (allocation.atCapacity) {
            console.warn(
                `[host-allocator] ${context}: every host is full at ` +
                    `${startTime.toISOString()} (${allocation.totalSlots} slots). ` +
                    `Overflowing onto ${allocation.host.email}.`
            )
        }

        return {
            hostUserId: enabled ? allocation.host.id : undefined,
            allocation,
        }
    } catch (err) {
        // Deliberately swallowed. See property 2 above.
        console.error(
            `[host-allocator] ${context}: allocation failed, falling back to users/me:`,
            err
        )
        return {}
    }
}
