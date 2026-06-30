import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createPayout, getConnectedAccountBalance } from '@/utils/stripe'

/**
 * CRON API Route: complete deferred bank payouts.
 *
 * A mentor payout is two hops: (1) a Transfer moves funds platform -> mentor's
 * Stripe balance (synchronous), (2) a Payout moves them Stripe balance -> bank.
 * Hop 2 fails if the transferred funds aren't yet "available" on the connected
 * account. When that happens the admin route marks the payout `paid` but leaves
 * `stripe_payout_id` null and records a marker in `failure_message`.
 *
 * This job finds those rows and retries hop 2 once funds are available, so they
 * self-resolve without manual intervention. The Stripe idempotency key
 * (`<payout_id>-bank`) makes retries safe — they can never create a second bank
 * payout, even if this cron overlaps a run or races the admin route.
 *
 * Path: /api/cron/retry-bank-payouts   (GET, hourly)
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Marker written by the admin payout route when the bank hop is deferred.
const PENDING_MARKER = 'Funds transferred; bank payout pending'

export async function GET(req: Request) {
    // Strict auth: this endpoint moves money, so the secret MUST be configured
    // and match. (Unlike the read-only crons, we never allow an unset secret.)
    const secret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    if (!secret || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Deferred bank payouts: transfer succeeded (status paid) but the bank hop
    // hasn't landed (no stripe_payout_id) and our code flagged it. Scoping to the
    // marker avoids touching legacy/pre-F3 payouts that also lack a payout id.
    const { data: pending, error } = await supabase
        .from('mentor_payouts')
        .select('id, mentor_id, amount_cents, currency')
        .eq('status', 'paid')
        .is('stripe_payout_id', null)
        .ilike('failure_message', `${PENDING_MARKER}%`)
        .order('created_at', { ascending: true })
        .limit(100)

    if (error) {
        console.error('retry-bank-payouts: query failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results: Array<{ payout_id: string; status: string; detail?: string }> = []

    for (const payout of pending || []) {
        try {
            // Need the mentor's connected account.
            const { data: mentor } = await supabase
                .from('mentors')
                .select('stripe_account_id')
                .eq('id', payout.mentor_id)
                .single()

            if (!mentor?.stripe_account_id) {
                results.push({ payout_id: payout.id, status: 'skipped', detail: 'no stripe_account_id' })
                continue
            }

            const currency = payout.currency || 'gbp'

            // Only attempt once funds are actually available, to avoid futile calls.
            const balance = await getConnectedAccountBalance(mentor.stripe_account_id)
            if (balance.available < payout.amount_cents) {
                results.push({
                    payout_id: payout.id,
                    status: 'still_pending',
                    detail: `available ${balance.available} < ${payout.amount_cents}`,
                })
                continue
            }

            const bankPayoutId = await createPayout(
                mentor.stripe_account_id,
                payout.amount_cents,
                currency,
                { payout_id: payout.id, mentor_id: payout.mentor_id },
                `${payout.id}-bank` // same idempotency key as the admin route — no double pay
            )

            await supabase
                .from('mentor_payouts')
                .update({ stripe_payout_id: bankPayoutId, failure_message: null })
                .eq('id', payout.id)

            results.push({ payout_id: payout.id, status: 'completed', detail: bankPayoutId })
            console.log(`retry-bank-payouts: payout ${payout.id} -> bank payout ${bankPayoutId}`)
        } catch (err: any) {
            // Leave the row deferred (keep the marker so it's retried next run).
            await supabase
                .from('mentor_payouts')
                .update({ failure_message: `${PENDING_MARKER}: ${err.message}` })
                .eq('id', payout.id)
            results.push({ payout_id: payout.id, status: 'retry_failed', detail: err.message })
            console.error(`retry-bank-payouts: payout ${payout.id} retry failed:`, err.message)
        }
    }

    return NextResponse.json({
        checked: pending?.length || 0,
        completed: results.filter(r => r.status === 'completed').length,
        results,
    })
}
