import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createTransfer, createPayout } from '@/utils/stripe'
import { renderInvoicePdf } from '@/utils/invoice-pdf'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { paymentRemittanceMentor } from '@/lib/email/templates'

// Stripe money movement needs the Node runtime.
export const runtime = 'nodejs'

/**
 * Admin endpoints for invoice-driven mentor payouts (spec §7).
 *
 * GET:  the queue of `submitted` ("Sent to Finance") invoices ready to pay.
 * POST: pay a batch of invoices. The money-movement core is unchanged from the
 *       period-driven version — only what *drives* it changed (invoices, not date
 *       ranges). Preserved guarantees:
 *         - transfer idempotency key = payout id (stable per invoice via the
 *           onConflict:invoice_id upsert) → no double transfer on retry.
 *         - pay the invoice's SNAPSHOTTED total_cents (never recompute from the
 *           current rate).
 *         - write mentor_payout_items only AFTER the transfer confirms (F4).
 *         - bank hop (hop 2) keyed `<payout>-bank`; on failure keep status 'paid'
 *           and record the PENDING_MARKER so retry-bank-payouts finishes it.
 *         - keep payout_id in transfer metadata so the Connect webhook reconciles.
 */

// Must match the prefix the retry-bank-payouts cron scans for.
const PENDING_MARKER = 'Funds transferred; bank payout pending'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.accessoxbridge.io').replace(/\/$/, '')

/**
 * Flow 2 — post-payout remittance (spec §6). Renders + stores the remittance PDF
 * (variant 'remittance', with the PAID stamp), emails the mentor a BRANDED
 * confirmation directly via Resend (same design/path as the other transactional
 * emails in lib/email — not the generic notifications trigger), and adds an
 * in-app notification.
 *
 * MUST be called after the payout + invoice are marked paid, and MUST be treated
 * as non-blocking by the caller: the money has already moved, so a remittance or
 * email failure is only logged — never rolled back — and can be re-sent by
 * calling this again (each call re-renders + re-records the document).
 */
async function emitRemittance(
    db: SupabaseClient,
    args: { invoiceId: string; mentorId: string; amountCents: number }
): Promise<void> {
    const { invoiceId, mentorId, amountCents } = args

    // 1. Render + store the remittance PDF (kind='remittance'). It reads the now-
    //    paid invoice + linked payout, so the PAID stamp shows date + Stripe refs.
    const remittancePath = await renderInvoicePdf(invoiceId, 'remittance')

    // 2. Invoice details + mentor contact.
    const { data: inv } = await db
        .from('mentor_invoices')
        .select('invoice_number, period_start, period_end')
        .eq('id', invoiceId).single()
    const { data: prof } = await db
        .from('profiles').select('full_name, email').eq('id', mentorId).single()

    // 3. Locate the invoice PDF (rendered at submit); render one if it's missing.
    const { data: invDoc } = await db
        .from('mentor_invoice_documents')
        .select('pdf_path')
        .eq('invoice_id', invoiceId).eq('kind', 'invoice')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const invoicePath = invDoc?.pdf_path || await renderInvoicePdf(invoiceId, 'invoice')

    const amount = `£${((amountCents || 0) / 100).toFixed(2)}`
    const num = inv?.invoice_number || 'your invoice'
    const fmtDate = (d?: string | null) =>
        d ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
            .format(new Date(`${d}T00:00:00Z`)) : ''
    const periodLabel = inv?.period_start && inv?.period_end
        ? `${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}` : ''

    // 4. Download both PDFs from storage as base64 for email attachments (no raw
    //    signed-URL link in the email — those get flagged as unsafe by mail clients).
    const toBase64 = async (path: string): Promise<string | null> => {
        const { data, error } = await db.storage.from('invoices').download(path)
        if (error || !data) return null
        return Buffer.from(await data.arrayBuffer()).toString('base64')
    }
    const [invoiceB64, remittanceB64] = await Promise.all([toBase64(invoicePath), toBase64(remittancePath)])
    const label = (inv?.invoice_number || 'invoice').replace(/[^A-Za-z0-9._-]/g, '_')
    const attachments = [
        invoiceB64 ? { filename: `${label}-invoice.pdf`, content: invoiceB64 } : null,
        remittanceB64 ? { filename: `${label}-remittance.pdf`, content: remittanceB64 } : null,
    ].filter((a): a is { filename: string; content: string } => a !== null)

    // 5. Branded confirmation email with both PDFs attached (direct via Resend,
    //    same path as the other transactional emails). Best-effort.
    const mentorEmail = prof?.email || ''
    if (mentorEmail) {
        const tmpl = paymentRemittanceMentor(prof?.full_name || 'Mentor', {
            invoiceNumber: num, amountLabel: amount, periodLabel,
            portalUrl: `${APP_URL}/dashboard/mentor/payouts`,
        })
        const sent = await sendEmail({ from: EMAIL_SENDER_TEAM, to: mentorEmail, subject: tmpl.subject, html: tmpl.html, attachments })
        if (!sent.ok) console.error(`[payouts] remittance email to ${mentorEmail} failed: ${sent.error}`)
    }

    // 6. In-app notification only. recipient_email is intentionally EMPTY so the
    //    notifications trigger does NOT also send a generic (unbranded) email.
    await db.from('notifications').insert({
        recipient_id: mentorId,
        recipient_email: '',
        type: 'system_alert',
        title: 'You have been paid',
        message: `You've been paid ${amount} for invoice ${num}.`,
        data: { invoice_id: invoiceId, invoice_number: num, action: 'view_remittance', kind: 'invoice_paid' },
    })
}

export async function GET() {
    try {
        const supabase = await createClient()

        // 1. Admin only.
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const db = createAdminClient() as unknown as SupabaseClient

        // 2. Submitted ("Sent to Finance") + paid invoices — the queue plus the
        //    paid history the admin UI filters between.
        const { data: invoices, error: invErr } = await db
            .from('mentor_invoices')
            .select('id, mentor_id, invoice_number, invoice_reference, invoice_date, period_start, period_end, subtotal_cents, withholding_cents, vat_cents, total_cents, currency, submitted_at, paid_at, is_self_billed, status')
            .in('status', ['submitted', 'paid'])
            .order('created_at', { ascending: false })
        if (invErr) throw invErr

        const rows = invoices || []
        const invoiceIds = rows.map((i: any) => i.id)
        const mentorIds = [...new Set(rows.map((i: any) => i.mentor_id))]

        // 3. Line items per invoice (for the §8.1 detail pane), enriched with the
        //    session start time + completion status.
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
        const sessionById: Record<string, any> = {}
        if (allSessionIds.length > 0) {
            const { data: sessions } = await db
                .from('sessions')
                .select('id, scheduled_at, status, zoom_meeting_status')
                .in('id', [...new Set(allSessionIds)])
            for (const ses of sessions || []) sessionById[ses.id] = ses
        }

        // 4. Mentor readiness (name/email + Stripe).
        const mentorMap: Record<string, any> = {}
        if (mentorIds.length > 0) {
            const { data: mentorRows } = await db
                .from('mentors')
                .select('id, stripe_account_id, payouts_enabled')
                .in('id', mentorIds)
            const { data: profileRows } = await db
                .from('profiles')
                .select('id, full_name, email')
                .in('id', mentorIds)
            const pById: Record<string, any> = {}
            for (const p of profileRows || []) pById[p.id] = p
            for (const m of mentorRows || []) {
                const p = pById[m.id] || {}
                mentorMap[m.id] = {
                    full_name: p.full_name || 'Unknown',
                    email: p.email || '',
                    stripe_account_id: m.stripe_account_id || null,
                    payouts_enabled: !!m.payouts_enabled,
                }
            }
        }

        const queue = rows.map((inv: any) => {
            const m = mentorMap[inv.mentor_id] || {}
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
                    amount_cents: it.amount_cents ?? 0,
                    completed,
                }
            })
            const ready = !!m.stripe_account_id && !!m.payouts_enabled && (inv.total_cents || 0) > 0
            return {
                invoice_id: inv.id,
                mentor_id: inv.mentor_id,
                mentor_name: m.full_name || 'Unknown',
                mentor_email: m.email || '',
                invoice_number: inv.invoice_number,
                invoice_reference: inv.invoice_reference,
                invoice_date: inv.invoice_date,
                period_start: inv.period_start,
                period_end: inv.period_end,
                subtotal_cents: inv.subtotal_cents || 0,
                withholding_cents: inv.withholding_cents || 0,
                vat_cents: inv.vat_cents || 0,
                amount_cents: inv.total_cents || 0,
                currency: inv.currency || 'gbp',
                is_self_billed: !!inv.is_self_billed,
                status: inv.status,
                submitted_at: inv.submitted_at,
                paid_at: inv.paid_at,
                sessions_count: items.length,
                total_minutes: items.reduce((s: number, it: any) => s + (it.duration_minutes || 0), 0),
                completed_count: items.filter((it: any) => it.completed).length,
                items,
                stripe_account_id: m.stripe_account_id || null,
                payouts_enabled: !!m.payouts_enabled,
                ready,
            }
        })

        return NextResponse.json({
            invoices: queue,
            total_amount_cents: queue
                .filter(q => q.status === 'submitted')
                .reduce((sum, q) => sum + q.amount_cents, 0),
        })
    } catch (error: any) {
        console.error('Invoice payout queue error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to load invoice queue' },
            { status: 500 }
        )
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // 1. Admin only.
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // 2. Body: batch of invoice ids.
        const body = await req.json().catch(() => ({}))
        const rawIds: unknown = body?.invoice_ids
        if (!Array.isArray(rawIds) || rawIds.length === 0) {
            return NextResponse.json({ error: 'invoice_ids (non-empty array) required' }, { status: 400 })
        }
        const invoiceIds = [...new Set(rawIds.filter((v): v is string => typeof v === 'string' && v.length > 0))]
        if (invoiceIds.length === 0) {
            return NextResponse.json({ error: 'invoice_ids must contain valid ids' }, { status: 400 })
        }

        const db = createAdminClient() as unknown as SupabaseClient

        const results: Array<{
            invoice_id: string
            success: boolean
            payout_id?: string
            transfer_id?: string
            error?: string
            bank_payout_pending?: boolean
            warning?: string
        }> = []

        // 3. Pay each invoice in order.
        for (const invoiceId of invoiceIds) {
            try {
                // Load invoice; must be 'submitted'.
                const { data: invoice } = await db
                    .from('mentor_invoices')
                    .select('id, mentor_id, status, total_cents, currency, period_start, period_end, invoice_date, payout_id')
                    .eq('id', invoiceId)
                    .single()

                if (!invoice) {
                    results.push({ invoice_id: invoiceId, success: false, error: 'Invoice not found' })
                    continue
                }
                if (invoice.status !== 'submitted') {
                    results.push({ invoice_id: invoiceId, success: false, error: `Invoice not payable (status: ${invoice.status})` })
                    continue
                }
                if (!invoice.total_cents || invoice.total_cents <= 0) {
                    results.push({ invoice_id: invoiceId, success: false, error: 'Invoice total is zero' })
                    continue
                }

                // Guard: an existing payout for this invoice already paid.
                const { data: existingPayout } = await db
                    .from('mentor_payouts')
                    .select('id, status, stripe_transfer_id')
                    .eq('invoice_id', invoiceId)
                    .maybeSingle()
                if (existingPayout && existingPayout.status === 'paid' && existingPayout.stripe_transfer_id) {
                    results.push({ invoice_id: invoiceId, success: false, error: 'Invoice already paid' })
                    continue
                }

                // Mentor Stripe readiness.
                const { data: mentor } = await db
                    .from('mentors')
                    .select('stripe_account_id, payouts_enabled')
                    .eq('id', invoice.mentor_id)
                    .single()
                if (!mentor?.stripe_account_id || !mentor.payouts_enabled) {
                    results.push({ invoice_id: invoiceId, success: false, error: 'Stripe account not set up or payouts not enabled' })
                    continue
                }

                // Invoice items = the line snapshot (also feeds mentor_payout_items).
                const { data: items } = await db
                    .from('mentor_invoice_items')
                    .select('session_id, duration_minutes, hourly_rate_cents, amount_cents')
                    .eq('invoice_id', invoiceId)
                const itemList = items || []
                const totalMinutes = itemList.reduce((s: number, it: any) => s + (it.duration_minutes || 0), 0)
                const currency = invoice.currency || 'gbp'
                // Pay the SNAPSHOTTED invoice total — never recompute from the rate.
                const amountCents = invoice.total_cents

                // period_start/end are NOT NULL on mentor_payouts — derive from the
                // invoice (falls back to the invoice date if somehow unset).
                const periodStart = invoice.period_start || invoice.invoice_date
                const periodEnd = invoice.period_end || invoice.invoice_date

                // Get-or-create the payout row keyed on invoice_id. We reuse the
                // existing (non-paid) row so its id — and therefore the transfer
                // idempotency key — stays stable across retries. This is done
                // manually rather than via `upsert({ onConflict: 'invoice_id' })`
                // because the unique index on invoice_id is partial
                // (WHERE invoice_id IS NOT NULL) and PostgREST can't use a partial
                // index as an ON CONFLICT target. The partial index still prevents
                // a genuine concurrent duplicate (the second insert throws).
                const payoutFields = {
                    mentor_id: invoice.mentor_id,
                    invoice_id: invoiceId,
                    period_start: periodStart,
                    period_end: periodEnd,
                    sessions_count: itemList.length,
                    total_minutes: totalMinutes,
                    amount_cents: amountCents,
                    currency,
                    status: 'pending' as const,
                }
                let payout: any
                if (existingPayout) {
                    const { data: upd, error: updErr } = await db
                        .from('mentor_payouts')
                        .update(payoutFields)
                        .eq('id', existingPayout.id)
                        .select()
                        .single()
                    if (updErr) throw updErr
                    payout = upd
                } else {
                    const { data: ins, error: insErr } = await db
                        .from('mentor_payouts')
                        .insert(payoutFields)
                        .select()
                        .single()
                    if (insErr) throw insErr
                    payout = ins
                }

                // Hop 1: transfer platform -> mentor Stripe balance, keyed by payout
                // id. Keep payout_id in metadata for Connect webhook reconciliation.
                const transferId = await createTransfer(
                    mentor.stripe_account_id,
                    amountCents,
                    currency,
                    { payout_id: payout.id, mentor_id: invoice.mentor_id, invoice_id: invoiceId },
                    payout.id // idempotency key
                )

                // Write payout items AFTER the transfer confirms (F4). One upsert,
                // all-or-nothing; on session_id conflict a retry doesn't duplicate.
                if (itemList.length > 0) {
                    const itemRows = itemList
                        .filter((it: any) => it.session_id)
                        .map((it: any) => ({
                            payout_id: payout.id,
                            session_id: it.session_id,
                            duration_minutes: it.duration_minutes || 0,
                            hourly_rate_cents: it.hourly_rate_cents || 0,
                            amount_cents: it.amount_cents || 0,
                        }))
                    if (itemRows.length > 0) {
                        const { error: itemsError } = await db
                            .from('mentor_payout_items')
                            .upsert(itemRows, { onConflict: 'session_id' })
                        if (itemsError) throw itemsError
                    }
                }

                // Hop 2: mentor Stripe balance -> bank. Deferred-hop handling exactly
                // as before — a failure does NOT undo the transfer.
                let bankPayoutId: string | null = null
                let bankPayoutError: string | null = null
                try {
                    bankPayoutId = await createPayout(
                        mentor.stripe_account_id,
                        amountCents,
                        currency,
                        { payout_id: payout.id, mentor_id: invoice.mentor_id },
                        `${payout.id}-bank` // idempotency key
                    )
                } catch (payoutErr: any) {
                    bankPayoutError = payoutErr.message || 'Bank payout failed'
                    console.error(
                        `Bank payout failed for invoice ${invoiceId} (payout ${payout.id}). ` +
                        `Transfer ${transferId} succeeded; funds are in the mentor's Stripe balance. ` +
                        `Reason: ${bankPayoutError}`
                    )
                }

                const nowIso = new Date().toISOString()

                // Mark the payout paid (transfer succeeded); record the bank marker if
                // the bank hop is deferred so retry-bank-payouts finishes it.
                await db
                    .from('mentor_payouts')
                    .update({
                        stripe_transfer_id: transferId,
                        stripe_payout_id: bankPayoutId,
                        status: 'paid',
                        failure_message: bankPayoutError ? `${PENDING_MARKER}: ${bankPayoutError}` : null,
                        processed_at: nowIso,
                        paid_at: nowIso,
                    })
                    .eq('id', payout.id)

                // Flip the invoice to paid + link the payout.
                await db
                    .from('mentor_invoices')
                    .update({ status: 'paid', payout_id: payout.id, paid_at: nowIso })
                    .eq('id', invoiceId)

                // Flow 2: remittance PDF + mentor email/notification. Non-blocking —
                // the money has moved, so a failure here is logged and re-sendable,
                // never a rollback.
                try {
                    await emitRemittance(db, { invoiceId, mentorId: invoice.mentor_id, amountCents })
                } catch (remitErr: any) {
                    console.error(
                        `[payouts] remittance for invoice ${invoiceId} (payout ${payout.id}) failed — ` +
                        `payout succeeded, safe to re-send: ${remitErr?.message || remitErr}`
                    )
                }

                results.push({
                    invoice_id: invoiceId,
                    success: true,
                    payout_id: payout.id,
                    transfer_id: transferId,
                    ...(bankPayoutError
                        ? { bank_payout_pending: true, warning: `Funds transferred but bank payout is pending: ${bankPayoutError}` }
                        : {}),
                })
            } catch (error: any) {
                console.error(`Payout error for invoice ${invoiceId}:`, error)
                results.push({ invoice_id: invoiceId, success: false, error: error.message || 'Failed to process payout' })
            }
        }

        return NextResponse.json({ success: results.every(r => r.success), results })
    } catch (error: any) {
        console.error('Process invoice payouts error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to process payouts' },
            { status: 500 }
        )
    }
}
