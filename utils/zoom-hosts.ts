/**
 * Zoom host pool — discovery.
 *
 * A Zoom user can host a limited number of meetings at once, so concurrency
 * equals (slots per host x number of hosts). Rather than maintaining the host
 * list in the database — a row to insert every time a seat is bought — we
 * discover it from Zoom itself: create the user, and it joins the pool.
 *
 * SECURITY — the allowlist is not optional.
 *
 * The pool must never be "every licensed user". Give an employee a Zoom licence
 * six months from now and they would silently start hosting student sessions,
 * putting recordings of minors into that person's Zoom cloud storage, with
 * nobody told. Membership is therefore by naming convention held in an env var,
 * so changing who can host requires a deploy — deliberate friction on a
 * privacy-relevant setting.
 *
 * Discovery FAILS CLOSED. If Zoom is unreachable we throw rather than falling
 * back to "any licensed user" or "default to office@" — either fallback
 * re-creates exactly the leak the allowlist exists to prevent.
 */

import { getZoomAccessToken } from './zoom'

export interface ZoomHost {
    id: string
    email: string
    /** Zoom user type 2 = Licensed. Basic users cannot cloud-record. */
    type: number
}

/**
 * Historical rows predate the pool and were all created via
 * `POST /users/me/meetings`, which resolves to office@accessoxbridge.io. A NULL
 * `sessions.zoom_host_user_id` therefore *means* this host — it is not missing
 * data. The allocator relies on that to avoid over-filling office@.
 */
export const LEGACY_HOST_USER_ID = 'NrX3STGVRnOYckZC7N6Zbg'

/**
 * Concurrent meetings a single Zoom user can host.
 *
 * MEASURED, not assumed. On 2026-09-16 two meetings ran simultaneously on
 * office@ and a third was refused with "You have a meeting that is currently
 * in-progress"; a meeting on zoom@ then started fine alongside them, proving
 * the limit is per-user rather than account-wide.
 *
 * Note the account settings API reports `concurrent_meeting: None` for both
 * users, which would imply a limit of 1. That is wrong. Trust the measurement.
 *
 * Getting this number wrong is costly in both directions: too low refuses
 * bookings that would work, too high lets Zoom reject a mentor at start time.
 */
export const SLOTS_PER_HOST = 2

const DEFAULT_HOST_PATTERN = '^zoom[a-z0-9]*@accessoxbridge\\.io$'
const CACHE_TTL_MS = 5 * 60 * 1000

let cache: { hosts: ZoomHost[]; expiresAt: number } | null = null

interface ZoomUserListResponse {
    users?: Array<{ id?: string; email?: string; type?: number; status?: string }>
    next_page_token?: string
}

function hostPattern(): RegExp {
    const raw = process.env.ZOOM_HOST_PATTERN || DEFAULT_HOST_PATTERN
    try {
        return new RegExp(raw, 'i')
    } catch {
        // A malformed pattern must not silently widen the pool to everyone.
        throw new Error(`ZOOM_HOST_PATTERN is not a valid regular expression: ${raw}`)
    }
}

/** Addresses allowed into the pool despite not matching the pattern. */
function extraHostEmails(): Set<string> {
    return new Set(
        (process.env.ZOOM_HOST_EXTRA || '')
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)
    )
}

/**
 * Every licensed, active Zoom user we are willing to host sessions on.
 *
 * Throws if Zoom cannot be reached, or if no eligible host exists — callers
 * must treat that as "cannot allocate", never as "host anywhere".
 */
export async function listPoolHosts(
    options: { force?: boolean } = {}
): Promise<ZoomHost[]> {
    if (!options.force && cache && Date.now() < cache.expiresAt) {
        return cache.hosts
    }

    const accessToken = await getZoomAccessToken()
    const pattern = hostPattern()
    const extra = extraHostEmails()

    const hosts: ZoomHost[] = []
    let pageToken = ''

    // Paginate: the account will outgrow one page as seats are added.
    do {
        const url = new URL('https://api.zoom.us/v2/users')
        url.searchParams.set('status', 'active')
        url.searchParams.set('page_size', '300')
        if (pageToken) url.searchParams.set('next_page_token', pageToken)

        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!response.ok) {
            const body = await response.text()
            throw new Error(
                `[zoom-hosts] Could not list Zoom users (${response.status}): ${body}`
            )
        }

        const data: ZoomUserListResponse = await response.json()

        for (const user of data.users || []) {
            const email = (user.email || '').toLowerCase()
            if (!user.id || !email) continue

            // Licensed only. A Basic user has a 40-minute cap and cannot
            // cloud-record, so it would silently break session reports.
            if (user.type !== 2) continue
            if (user.status !== 'active') continue

            if (!pattern.test(email) && !extra.has(email)) continue

            hosts.push({ id: user.id, email, type: user.type })
        }

        pageToken = data.next_page_token || ''
    } while (pageToken)

    if (hosts.length === 0) {
        throw new Error(
            '[zoom-hosts] No eligible Zoom hosts found. Check ZOOM_HOST_PATTERN ' +
                'and that at least one matching user is Licensed and active.'
        )
    }

    // Stable ordering so logs and allocation are reproducible.
    hosts.sort((a, b) => a.email.localeCompare(b.email))

    cache = { hosts, expiresAt: Date.now() + CACHE_TTL_MS }
    return hosts
}

/** Drop the cache — used by diagnostics and after provisioning a new host. */
export function clearPoolHostCache(): void {
    cache = null
}

/** Is the pool actually driving meeting creation, or only shadow-logging? */
export function isHostPoolEnabled(): boolean {
    return process.env.ZOOM_HOST_POOL_ENABLED === 'true'
}
