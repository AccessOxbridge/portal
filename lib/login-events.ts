import { headers } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'

export type LoginStatus = 'success' | 'failed'

/**
 * The client's IP, as seen from behind Vercel's proxy.
 *
 * `x-forwarded-for` is a comma-separated chain — client first, then each proxy
 * that handled the request — so the first entry is the only one that means
 * anything. Reading the socket address instead is the classic version of this
 * feature: every row comes out as a load-balancer address like
 * `::ffff:172.31.45.0`, or `::1` in local dev, and the column looks
 * authoritative while telling you nothing.
 */
function clientIp(h: Headers): string | null {
    const forwarded = h.get('x-forwarded-for')
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim()
        if (first) return first
    }
    // Vercel sets this too; keep it as a fallback for other hosts.
    return h.get('x-real-ip')?.trim() || null
}

/**
 * Record one sign-in attempt.
 *
 * Writes with the service-role client because a failed attempt has no session:
 * the caller is `anon` at that moment, so nothing user-scoped could insert the
 * row. See the migration for why there is no INSERT policy at all.
 *
 * Never throws. A logging failure must not cost someone their sign-in, so
 * everything here is swallowed and reported to the server console only.
 */
export async function recordLoginEvent(email: string, status: LoginStatus): Promise<void> {
    try {
        const h = await headers()
        const admin = createAdminClient()
        const normalisedEmail = email.trim().toLowerCase()

        // Resolve the account so a user's own history is complete even for
        // failed attempts. A miss leaves user_id null, which keeps the row
        // admin-only — a wrong-address attempt belongs to nobody's history.
        const { data: profile } = await admin
            .from('profiles')
            .select('id')
            .eq('email', normalisedEmail)
            .maybeSingle()

        await admin.from('login_events').insert({
            user_id: profile?.id ?? null,
            email: normalisedEmail,
            ip: clientIp(h),
            // Truncated: some agents are enormous and the column is only ever
            // read to tell one device from another.
            user_agent: h.get('user-agent')?.slice(0, 400) ?? null,
            status,
        })

        // Retention is enforced here rather than on a schedule so there is no
        // cron to forget. Indexed and bounded, so it costs nothing per login.
        await admin.rpc('prune_login_events')
    } catch (error) {
        console.error('Failed to record login event:', error)
    }
}
