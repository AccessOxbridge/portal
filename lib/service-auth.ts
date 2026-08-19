import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Bearer-token guard for server-to-server routes under /api/service/*.
 *
 * Same posture as the CRON_SECRET checks in app/api/cron/*: the secret MUST be
 * configured and the caller MUST present it, so a misconfigured deploy fails
 * closed (503) rather than silently serving data to anyone who finds the URL.
 *
 * A DELIBERATELY SEPARATE secret from CRON_SECRET. These routes read private
 * student conversations; the cron routes send email. Sharing one token would
 * mean revoking either one breaks both, and would widen the blast radius of a
 * leak from either side.
 *
 * Note this project's Vercel deployment protection is OFF, so every route here
 * — preview and production alike — is reachable by anyone who knows the URL.
 * This token is the only thing in front of it. Treat it accordingly.
 */

/**
 * Constant-time comparison.
 *
 * `timingSafeEqual` throws when the two buffers differ in length, and that
 * throw is itself an oracle: it tells an attacker their guess was the wrong
 * length. Hashing both sides first gives two fixed-width 32-byte digests, so
 * every comparison takes the same path and leaks neither length nor content.
 */
function secureEquals(a: string, b: string): boolean {
    const digestA = createHash('sha256').update(a).digest()
    const digestB = createHash('sha256').update(b).digest()
    return timingSafeEqual(digestA, digestB)
}

export type ServiceAuthFailure = { ok: false; status: 401 | 503; error: string }
export type ServiceAuthResult = { ok: true } | ServiceAuthFailure

/**
 * Verify the Authorization header against PORTAL_SERVICE_TOKEN.
 *
 * Returns a result rather than a Response so callers stay in control of the
 * body shape, and so this stays trivially unit-testable.
 */
export function verifyServiceToken(req: Request): ServiceAuthResult {
    const expected = process.env.PORTAL_SERVICE_TOKEN

    if (!expected) {
        console.error(
            'PORTAL_SERVICE_TOKEN is not set; refusing to serve /api/service/*.'
        )
        return { ok: false, status: 503, error: 'Service API not configured' }
    }

    // A short token is almost certainly a placeholder that got committed or a
    // truncated paste. Refuse rather than pretend it protects anything.
    if (expected.length < 32) {
        console.error(
            'PORTAL_SERVICE_TOKEN is shorter than 32 characters; refusing to serve /api/service/*.'
        )
        return { ok: false, status: 503, error: 'Service API not configured' }
    }

    const header = req.headers.get('authorization')
    if (!header || !header.startsWith('Bearer ')) {
        return { ok: false, status: 401, error: 'Unauthorized' }
    }

    return secureEquals(header.slice('Bearer '.length), expected)
        ? { ok: true }
        : { ok: false, status: 401, error: 'Unauthorized' }
}
