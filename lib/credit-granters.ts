/**
 * The ADMIN_CREDIT_GRANTERS allowlist.
 *
 * Credits convert directly into paid tutoring hours, so granting them is gated
 * on TWO independent systems rather than one: the caller must be an admin in
 * `profiles.role` AND their user id must appear in this env var. Flipping a
 * role row in the database is then not enough on its own to mint credits — an
 * attacker would also need the Vercel project.
 *
 * User IDs rather than emails: the uid is what auth.getUser() returns directly,
 * it is immutable, and nothing in the app can change it. An email can be
 * changed at the auth layer.
 *
 * Fail-closed, matching the posture of lib/service-auth.ts: an unset or empty
 * list means nobody can grant, not everybody. A misconfigured deploy must fail
 * loudly rather than silently open the door.
 */

export type GranterCheck =
    | { ok: true }
    | { ok: false; status: 503; error: string }
    | { ok: false; status: 403; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Parse the env var into a set of lowercased uuids. Invalid entries are dropped and logged. */
export function creditGranterIds(): Set<string> {
    const raw = process.env.ADMIN_CREDIT_GRANTERS || ''
    const ids = new Set<string>()

    for (const part of raw.split(',')) {
        const value = part.trim()
        if (!value) continue
        if (!UUID_RE.test(value)) {
            console.error('[credit-granters] ignoring non-uuid entry in ADMIN_CREDIT_GRANTERS')
            continue
        }
        ids.add(value.toLowerCase())
    }

    return ids
}

/**
 * Is this authenticated user permitted to move credits?
 *
 * Call this AFTER the usual profiles.role check — it is the second gate, not a
 * replacement for the first.
 */
export function verifyCreditGranter(userId: string): GranterCheck {
    const granters = creditGranterIds()

    if (granters.size === 0) {
        console.error(
            'ADMIN_CREDIT_GRANTERS is unset or contains no valid uuids; refusing all credit adjustments.'
        )
        return { ok: false, status: 503, error: 'Credit adjustment is not configured' }
    }

    if (!granters.has(userId.toLowerCase())) {
        console.error(`[credit-granters] admin ${userId} is not in ADMIN_CREDIT_GRANTERS; refusing.`)
        return { ok: false, status: 403, error: 'You are not permitted to adjust credits' }
    }

    return { ok: true }
}
