import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { renderInvoicePdf } from '@/utils/invoice-pdf'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { invoiceSubmittedAdmin } from '@/lib/email/templates'

// PDF rendering (via renderInvoicePdf) needs the Node runtime.
export const runtime = 'nodejs'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.accessoxbridge.io').replace(/\/$/, '')

/**
 * POST /api/mentor/invoices/[id]/submit
 *
 * Mentor submits their own DRAFT invoice → "Sent to Finance" (spec §4.1, §4.2, §5.3).
 *   - Atomically transitions draft → submitted (the conditional update is the
 *     race guard: only one request wins, so a number is never burned on a
 *     double-submit).
 *   - Assigns a gapless invoice_number from mentor_invoice_seq (AO-INV-YYYY-NNNNNN),
 *     sets invoice_reference "{mentor name} - {date}", invoice_date = today,
 *     submitted_at = now.
 *   - The invoice is now frozen: no endpoint mutates a non-draft invoice's items
 *     or amounts — corrections are void + reissue (§4.2).
 *   - Renders + stores the invoice PDF, and notifies admins (in-app + email).
 */
export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        if (!id) {
            return NextResponse.json({ error: 'Invoice id required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single()
        if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const db = createAdminClient() as unknown as SupabaseClient

        // 0. Enforce the 2-hour minimum before consuming a sequence number.
        //    Line items are frozen at draft creation, so a plain read is a safe
        //    pre-check; the atomic transition below still guards ownership/status.
        const MIN_INVOICE_MINUTES = 120
        const { data: preItems, error: preErr } = await db
            .from('mentor_invoice_items')
            .select('duration_minutes')
            .eq('invoice_id', id)
        if (preErr) throw preErr
        const totalMinutes = (preItems || []).reduce(
            (s: number, it: any) => s + (it.duration_minutes || 0),
            0
        )
        if (totalMinutes < MIN_INVOICE_MINUTES) {
            return NextResponse.json(
                {
                    error: `Invoices must total at least 2 hours to send to Finance. This one is ${(totalMinutes / 60).toFixed(1)}h — add more completed sessions before submitting.`,
                },
                { status: 400 }
            )
        }

        // Today's date (Europe/London) as YYYY-MM-DD for a UK invoice.
        const todayIso = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/London',
        }).format(new Date())
        const nowIso = new Date().toISOString()

        // 1. Atomic draft → submitted transition (race guard). Only a draft owned
        //    by this mentor flips; RETURNING tells us we won.
        const { data: transitioned, error: transErr } = await db
            .from('mentor_invoices')
            .update({ status: 'submitted', submitted_at: nowIso, invoice_date: todayIso })
            .eq('id', id)
            .eq('mentor_id', user.id)
            .eq('status', 'draft')
            .select('id, total_cents, invoice_number')
            .maybeSingle()
        if (transErr) throw transErr

        if (!transitioned) {
            // Determine the precise reason for a clear error.
            const { data: existing } = await db
                .from('mentor_invoices')
                .select('id, mentor_id, status')
                .eq('id', id)
                .maybeSingle()
            if (!existing) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
            }
            if (existing.mentor_id !== user.id) {
                return NextResponse.json({ error: 'Not your invoice' }, { status: 403 })
            }
            return NextResponse.json(
                { error: `Only draft invoices can be submitted (status: ${existing.status})` },
                { status: 400 }
            )
        }

        // 2. Assign the invoice number (gapless sequence) + reference. The number is
        //    only consumed now that we've won the transition, so double-submits
        //    don't burn sequence values.
        const mentorName = profile.full_name || 'Mentor'
        const { data: invoiceNumber, error: seqErr } = await db.rpc('next_mentor_invoice_number')
        if (seqErr || !invoiceNumber) throw seqErr || new Error('Failed to assign invoice number')

        const { data: submitted, error: numErr } = await db
            .from('mentor_invoices')
            .update({
                invoice_number: invoiceNumber,
                invoice_reference: `${mentorName} - ${todayIso}`,
            })
            .eq('id', id)
            .select('*')
            .single()
        if (numErr) throw numErr

        // 3. Render + store the invoice PDF. Best-effort: if it fails the invoice is
        //    still submitted (GET .../pdf can regenerate it on demand) — don't burn
        //    the number by rolling back.
        let pdfWarning: string | undefined
        try {
            await renderInvoicePdf(id, 'invoice')
        } catch (pdfErr: any) {
            pdfWarning = `Invoice submitted but PDF generation failed: ${pdfErr.message || pdfErr}`
            console.error('[invoices:submit] PDF render failed:', pdfErr)
        }

        // 4. Notify admins: a BRANDED email (direct via Resend, same as the other
        //    transactional emails) + an in-app notification. recipient_email is left
        //    EMPTY on the notification so the generic notifications trigger doesn't
        //    also send an unbranded duplicate. Best-effort.
        try {
            const { data: admins } = await db
                .from('profiles')
                .select('id, email')
                .in('role', ['admin', 'admin-dev'])

            if (admins && admins.length > 0) {
                const amount = `£${((submitted.total_cents || 0) / 100).toFixed(2)}`
                const tmpl = invoiceSubmittedAdmin({
                    mentorName,
                    invoiceNumber,
                    amountLabel: amount,
                    payoutsUrl: `${APP_URL}/dashboard/admin/payouts`,
                })

                // Branded email to each admin.
                await Promise.all(
                    admins
                        .filter((a: any) => a.email)
                        .map(async (a: any) => {
                            const sent = await sendEmail({ from: EMAIL_SENDER_TEAM, to: a.email, subject: tmpl.subject, html: tmpl.html })
                            if (!sent.ok) console.error(`[invoices:submit] admin email to ${a.email} failed: ${sent.error}`)
                        })
                )

                // In-app notifications (email left empty — see above).
                const rows = admins.map((a: any) => ({
                    recipient_id: a.id,
                    recipient_email: '',
                    type: 'system_alert' as const,
                    title: 'Invoice sent to Finance',
                    message: `${mentorName} sent invoice ${invoiceNumber} (${amount}) to finance.`,
                    data: { invoice_id: id, invoice_number: invoiceNumber, action: 'view_payouts', kind: 'invoice_submitted' },
                }))
                await db.from('notifications').insert(rows)
            }
        } catch (notifyErr) {
            console.error('[invoices:submit] admin notification failed:', notifyErr)
        }

        return NextResponse.json({ invoice: submitted, ...(pdfWarning ? { warning: pdfWarning } : {}) })
    } catch (error: any) {
        console.error('[invoices:submit]', error)
        return NextResponse.json(
            { error: error.message || 'Failed to submit invoice' },
            { status: 500 }
        )
    }
}
