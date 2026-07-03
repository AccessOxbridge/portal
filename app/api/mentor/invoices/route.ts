import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
    sessionAmountCents,
    computeInvoiceTotals,
    DEFAULT_HOURLY_RATE_CENTS,
} from '@/utils/invoices'

/**
 * GET /api/mentor/invoices
 *
 * Lists the current mentor's invoices for the two-pane UI (spec §8.2). Each
 * invoice carries its line items (enriched with the session start time +
 * completion status for the §8.1 detail) and aggregates (sessions_count,
 * total_minutes, completed_count).
 */
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', user.id).single()
        if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const db = createAdminClient() as unknown as SupabaseClient

        const { data: invoices, error: invErr } = await db
            .from('mentor_invoices')
            .select('*')
            .eq('mentor_id', user.id)
            .order('created_at', { ascending: false })
        if (invErr) throw invErr

        const rows = invoices || []
        const invoiceIds = rows.map((i: any) => i.id)

        // Items for all invoices in one query.
        const itemsByInvoice: Record<string, any[]> = {}
        const allSessionIds: string[] = []
        if (invoiceIds.length > 0) {
            const { data: items } = await db
                .from('mentor_invoice_items')
                .select('invoice_id, session_id, session_date, student_name, description, duration_minutes, hourly_rate_cents, amount_cents')
                .in('invoice_id', invoiceIds)
                .order('session_date', { ascending: true })
            for (const it of items || []) {
                ;(itemsByInvoice[it.invoice_id] || (itemsByInvoice[it.invoice_id] = [])).push(it)
                if (it.session_id) allSessionIds.push(it.session_id)
            }
        }

        // Session start times + completion status for the detail line items.
        const sessionById: Record<string, any> = {}
        if (allSessionIds.length > 0) {
            const { data: sessions } = await db
                .from('sessions')
                .select('id, scheduled_at, status, zoom_meeting_status')
                .in('id', [...new Set(allSessionIds)])
            for (const ses of sessions || []) sessionById[ses.id] = ses
        }

        const result = rows.map((inv: any) => {
            const items = (itemsByInvoice[inv.id] || []).map((it: any) => {
                const ses = it.session_id ? sessionById[it.session_id] : null
                const completed = ses ? (ses.status === 'completed' || ses.zoom_meeting_status === 'ended') : true
                return {
                    session_id: it.session_id,
                    session_date: it.session_date,
                    scheduled_at: ses?.scheduled_at ?? null,
                    student_name: it.student_name,
                    description: it.description,
                    duration_minutes: it.duration_minutes ?? 60,
                    hourly_rate_cents: it.hourly_rate_cents ?? 0,
                    amount_cents: it.amount_cents ?? 0,
                    completed,
                }
            })
            return {
                ...inv,
                items,
                sessions_count: items.length,
                total_minutes: items.reduce((s: number, it: any) => s + (it.duration_minutes || 0), 0),
                completed_count: items.filter((it: any) => it.completed).length,
            }
        })

        return NextResponse.json({ invoices: result })
    } catch (error: any) {
        console.error('[invoices:list]', error)
        return NextResponse.json(
            { error: error.message || 'Failed to load invoices' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/mentor/invoices
 *
 * Create a DRAFT invoice from a set of the mentor's own unbilled sessions
 * (spec §4.3 / §5.2). Flow:
 *   1. Verify every requested session belongs to this mentor and is finished.
 *   2. Atomically CLAIM them (UPDATE sessions SET invoice_id = <new> WHERE
 *      id = ANY(ids) AND invoice_id IS NULL RETURNING id). Only claimed rows go
 *      on the invoice; anything lost to a race is dropped and reported.
 *   3. Snapshot each claimed session into mentor_invoice_items (rate frozen now).
 *   4. Compute totals + derived period and save; invoice_number is NOT assigned
 *      until submit (a later ticket).
 *
 * Amounts are always computed server-side — client amounts are never trusted.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // Auth: caller must be signed in and be a mentor.
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Parse + validate body.
        const body = await req.json().catch(() => ({}))
        const rawIds: unknown = body?.session_ids
        if (!Array.isArray(rawIds) || rawIds.length === 0) {
            return NextResponse.json({ error: 'session_ids (non-empty array) required' }, { status: 400 })
        }
        const requestedIds = [...new Set(rawIds.filter((v): v is string => typeof v === 'string' && v.length > 0))]
        if (requestedIds.length === 0) {
            return NextResponse.json({ error: 'session_ids must contain valid ids' }, { status: 400 })
        }

        // `db` is untyped because the generated Supabase types don't yet include
        // sessions.invoice_id or the mentor_invoice* tables.
        const db = createAdminClient() as unknown as SupabaseClient

        // Mentor's current rate — snapshotted onto every line item below.
        const { data: mentor } = await db
            .from('mentors')
            .select('hourly_rate_cents')
            .eq('id', user.id)
            .single()
        const hourlyRateCents = mentor?.hourly_rate_cents || DEFAULT_HOURLY_RATE_CENTS

        // 1. Verify ownership + eligibility. Fetch only the requested ids that are
        //    actually this mentor's; anything missing was not theirs.
        const { data: candidates, error: candErr } = await db
            .from('sessions')
            .select('id, scheduled_at, duration_minutes, student_id, status, zoom_meeting_status, invoice_id')
            .in('id', requestedIds)
            .eq('mentor_id', user.id)
        if (candErr) throw candErr

        const ownedById = new Map((candidates || []).map(s => [s.id, s]))
        const notOwned = requestedIds.filter(id => !ownedById.has(id))
        if (notOwned.length > 0) {
            return NextResponse.json(
                { error: 'Some sessions do not belong to you', session_ids: notOwned },
                { status: 400 }
            )
        }

        const isFinished = (s: any) => s.status === 'completed' || s.zoom_meeting_status === 'ended'
        const notFinished = (candidates || []).filter(s => !isFinished(s)).map(s => s.id)
        if (notFinished.length > 0) {
            return NextResponse.json(
                { error: 'Some sessions are not completed yet', session_ids: notFinished },
                { status: 400 }
            )
        }

        // Sessions already on another invoice (pre-check; the atomic claim is the
        // real guard against the race).
        const alreadyInvoiced = (candidates || []).filter(s => s.invoice_id != null).map(s => s.id)
        const eligibleIds = (candidates || []).filter(s => s.invoice_id == null).map(s => s.id)
        if (eligibleIds.length === 0) {
            return NextResponse.json(
                { error: 'All selected sessions are already invoiced', already_invoiced_session_ids: alreadyInvoiced },
                { status: 409 }
            )
        }

        // Create the draft invoice first so we have an id to claim sessions with.
        const { data: invoice, error: invErr } = await db
            .from('mentor_invoices')
            .insert({
                mentor_id: user.id,
                status: 'draft',
                currency: 'gbp',
                is_self_billed: false,
            })
            .select()
            .single()
        if (invErr || !invoice) throw invErr || new Error('Failed to create draft invoice')

        try {
            // 2. Atomic claim: only rows still unclaimed (invoice_id IS NULL) flip to
            //    this invoice. A concurrent request claims nothing for the same row.
            const { data: claimedRows, error: claimErr } = await db
                .from('sessions')
                .update({ invoice_id: invoice.id })
                .in('id', eligibleIds)
                .is('invoice_id', null)
                .eq('mentor_id', user.id)
                .select('id, scheduled_at, duration_minutes, student_id')
            if (claimErr) throw claimErr

            const claimed = claimedRows || []
            const claimedIds = new Set(claimed.map(r => r.id))
            const droppedInRace = eligibleIds.filter(id => !claimedIds.has(id))

            if (claimed.length === 0) {
                // Everything was claimed by someone else between the pre-check and
                // now — nothing to invoice. Discard the empty draft.
                await db.from('mentor_invoices').delete().eq('id', invoice.id)
                return NextResponse.json(
                    {
                        error: 'None of the selected sessions could be claimed (already invoiced)',
                        dropped_session_ids: droppedInRace,
                        already_invoiced_session_ids: alreadyInvoiced,
                    },
                    { status: 409 }
                )
            }

            // Resolve student names for the claimed sessions (snapshot).
            const studentIds = [...new Set(claimed.map(r => r.student_id).filter(Boolean))]
            const nameById: Record<string, string> = {}
            if (studentIds.length > 0) {
                const { data: students } = await db
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', studentIds)
                for (const s of students || []) nameById[s.id] = s.full_name || 'Student'
            }

            // 3. Snapshot each claimed session as a line item.
            const itemRows = claimed.map(s => {
                const duration = s.duration_minutes ?? 60
                return {
                    invoice_id: invoice.id,
                    session_id: s.id,
                    description: '1-1 Mentorship Session',
                    student_name: nameById[s.student_id] || 'Student',
                    session_date: s.scheduled_at ? String(s.scheduled_at).slice(0, 10) : null,
                    duration_minutes: duration,
                    hourly_rate_cents: hourlyRateCents,
                    amount_cents: sessionAmountCents(duration, hourlyRateCents),
                }
            })
            const { error: itemsErr } = await db.from('mentor_invoice_items').insert(itemRows)
            if (itemsErr) throw itemsErr

            // 4. Compute totals + derived period (min/max session date, display only).
            const totals = computeInvoiceTotals(itemRows.map(i => i.amount_cents), 0, 0)
            const sortedDates = itemRows
                .map(i => i.session_date)
                .filter((d): d is string => !!d)
                .sort()
            const periodStart = sortedDates[0] ?? null
            const periodEnd = sortedDates[sortedDates.length - 1] ?? null

            const { data: finalInvoice, error: updErr } = await db
                .from('mentor_invoices')
                .update({
                    subtotal_cents: totals.subtotal_cents,
                    withholding_cents: totals.withholding_cents,
                    vat_cents: totals.vat_cents,
                    total_cents: totals.total_cents,
                    period_start: periodStart,
                    period_end: periodEnd,
                })
                .eq('id', invoice.id)
                .select()
                .single()
            if (updErr) throw updErr

            return NextResponse.json({
                invoice: finalInvoice,
                items: itemRows,
                dropped_session_ids: droppedInRace,
                already_invoiced_session_ids: alreadyInvoiced,
            })
        } catch (innerErr: any) {
            // Compensating cleanup: release any claimed sessions and remove the draft
            // so a mid-flight failure never leaves sessions stuck out of the pool.
            await db.from('sessions').update({ invoice_id: null }).eq('invoice_id', invoice.id)
            await db.from('mentor_invoice_items').delete().eq('invoice_id', invoice.id)
            await db.from('mentor_invoices').delete().eq('id', invoice.id)
            throw innerErr
        }
    } catch (error: any) {
        console.error('[invoices:create]', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create invoice' },
            { status: 500 }
        )
    }
}
