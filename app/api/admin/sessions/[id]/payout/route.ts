import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
    sessionAmountCents,
    DEFAULT_HOURLY_RATE_CENTS,
} from '@/utils/invoices'

const MAX_PAYOUT_CENTS = 1_000_000 // £10,000

/**
 * PATCH /api/admin/sessions/[id]/payout
 *
 * Set or clear a flat per-session payout override (pence).
 * Blocked when the session is already claimed on an invoice (invoice_id set).
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { id: sessionId } = await params
        if (!sessionId) {
            return NextResponse.json({ error: 'Session id required' }, { status: 400 })
        }

        const body = await req.json().catch(() => null)
        if (!body || !('payout_amount_cents' in body)) {
            return NextResponse.json(
                { error: 'payout_amount_cents is required (number or null to clear)' },
                { status: 400 }
            )
        }

        const raw = body.payout_amount_cents
        let payoutAmountCents: number | null

        if (raw === null) {
            payoutAmountCents = null
        } else if (
            typeof raw === 'number' &&
            Number.isInteger(raw) &&
            raw >= 0 &&
            raw <= MAX_PAYOUT_CENTS
        ) {
            payoutAmountCents = raw
        } else {
            return NextResponse.json(
                {
                    error: `payout_amount_cents must be null or an integer between 0 and ${MAX_PAYOUT_CENTS}`,
                },
                { status: 400 }
            )
        }

        const { data: session, error: sessionError } = await adminSupabase
            .from('sessions')
            .select('id, mentor_id, duration_minutes, invoice_id, payout_amount_cents')
            .eq('id', sessionId)
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        if (session.invoice_id) {
            return NextResponse.json(
                {
                    error: 'This session is on an invoice. Void or discard that invoice before changing payout.',
                    invoice_id: session.invoice_id,
                },
                { status: 409 }
            )
        }

        const { error: updateError } = await adminSupabase
            .from('sessions')
            .update({
                payout_amount_cents: payoutAmountCents,
                updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .is('invoice_id', null)

        if (updateError) {
            return NextResponse.json(
                { error: updateError.message || 'Failed to update payout' },
                { status: 500 }
            )
        }

        const { data: mentor } = await adminSupabase
            .from('mentors')
            .select('hourly_rate_cents')
            .eq('id', session.mentor_id)
            .single()

        const hourlyRateCents = mentor?.hourly_rate_cents ?? DEFAULT_HOURLY_RATE_CENTS
        const owedCents = sessionAmountCents(
            session.duration_minutes,
            hourlyRateCents,
            payoutAmountCents
        )

        return NextResponse.json({
            success: true,
            session_id: sessionId,
            payout_amount_cents: payoutAmountCents,
            override_active: payoutAmountCents != null,
            owed_cents: owedCents,
            hourly_rate_cents: hourlyRateCents,
        })
    } catch (error: any) {
        console.error('[admin/sessions/payout]', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to update session payout' },
            { status: 500 }
        )
    }
}
