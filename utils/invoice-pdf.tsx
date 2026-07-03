import React from 'react'
import {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet,
    renderToBuffer,
} from '@react-pdf/renderer'
import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/utils/supabase/admin'
import { INVOICE_LOGO_DATA_URI } from '@/utils/invoice-logo'

// ---------------------------------------------------------------------------
// Fixed BILL-TO party (spec §8.1).
// ---------------------------------------------------------------------------
export const ACCESS_OXBRIDGE = {
    name: 'Access Oxbridge Ltd',
    addressLines: ['20 Wenlock Road', 'London', 'United Kingdom'],
    postcode: 'N1 7GU',
    companyRegNo: '16594927',
}

// ---------------------------------------------------------------------------
// Formatting helpers (UK invoice → format in Europe/London, GBP).
// ---------------------------------------------------------------------------
const LONDON = 'Europe/London'

function fmtGBP(cents: number, currency = 'gbp'): string {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format((cents || 0) / 100)
}

function fmtDate(value?: string | null): string {
    if (!value) return '—'
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: LONDON,
    }).format(d)
}

function fmtTime(d: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: LONDON,
    }).format(d)
}

function fmtTimeRange(scheduledAt?: string | null, durationMinutes?: number | null): string {
    if (!scheduledAt) return ''
    const start = new Date(scheduledAt)
    if (isNaN(start.getTime())) return ''
    const end = new Date(start.getTime() + (durationMinutes ?? 60) * 60_000)
    return `${fmtTime(start)} – ${fmtTime(end)}`
}

function fmtDuration(minutes: number): string {
    const m = Math.max(0, Math.round(minutes || 0))
    return `${Math.floor(m / 60)}h ${m % 60}m`
}

function statusLabel(status: string): string {
    switch (status) {
        case 'submitted': return 'Sent to Finance'
        case 'paid': return 'Paid'
        case 'void': return 'Void'
        case 'draft': return 'Draft'
        default: return status
    }
}

// ---------------------------------------------------------------------------
// Data shape the pure component renders from.
// ---------------------------------------------------------------------------
export interface InvoicePdfItem {
    session_date: string | null
    scheduled_at: string | null
    student_name: string | null
    description: string | null
    duration_minutes: number
    amount_cents: number
    completed: boolean
}

export interface InvoicePdfData {
    variant: 'invoice' | 'remittance'
    mentor: { full_name: string; email: string }
    invoice: {
        invoice_number: string | null
        invoice_reference: string | null
        invoice_date: string | null
        period_start: string | null
        period_end: string | null
        status: string
        subtotal_cents: number
        withholding_cents: number
        vat_cents: number
        total_cents: number
        currency: string
        is_self_billed: boolean
        submitted_at: string | null
        paid_at: string | null
    }
    items: InvoicePdfItem[]
    totalMinutes: number
    completedCount: number
    payout: {
        paid_at: string | null
        stripe_transfer_id: string | null
        stripe_payout_id: string | null
    } | null
}

// ---------------------------------------------------------------------------
// Styles (clean Wise-style invoice: big title, generous whitespace, thin rules).
// ---------------------------------------------------------------------------
const INK = '#111827'
const BODY = '#374151'
const MUTED = '#6b7280'
const LINE = '#e5e7eb'
const LINE_DARK = '#d1d5db'
const PAID_GREEN = '#0e9f6e'

const s = StyleSheet.create({
    page: { paddingTop: 48, paddingBottom: 72, paddingHorizontal: 56, fontSize: 10, color: BODY, fontFamily: 'Helvetica' },

    // header: logo on its own line, then big title left + number / date / status meta right
    logo: { width: 40, height: 40, marginBottom: 18 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: INK },
    metaCols: { flexDirection: 'row', marginTop: 6 },
    metaCol: { marginLeft: 28, maxWidth: 130 },
    metaLabel: { fontSize: 9, color: MUTED, marginBottom: 4 },
    metaValue: { fontSize: 10, color: INK },

    headerRule: { borderBottomColor: LINE, borderBottomWidth: 1, marginTop: 22, marginBottom: 24 },

    // Billed to / Issued by
    partiesRow: { flexDirection: 'row' },
    party: { width: '50%', paddingRight: 24 },
    partyLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 6 },
    partyLine: { fontSize: 10, color: BODY, marginBottom: 2 },

    // big amount headline + key/value info lines (bold key, regular value)
    headline: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 34 },
    infoLines: { marginTop: 16 },
    infoLine: { fontSize: 10, color: BODY, marginBottom: 3 },
    infoKey: { fontFamily: 'Helvetica-Bold', color: INK },

    // table
    tHead: { flexDirection: 'row', marginTop: 30, paddingBottom: 8, borderBottomColor: LINE_DARK, borderBottomWidth: 1 },
    tRow: { flexDirection: 'row', paddingVertical: 12, borderBottomColor: LINE, borderBottomWidth: 1 },
    th: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK },
    cDate: { width: '25%', paddingRight: 8 },
    cDesc: { width: '39%', paddingRight: 8 },
    cDur: { width: '16%', textAlign: 'right' },
    cAmt: { width: '20%', textAlign: 'right' },
    strong: { fontFamily: 'Helvetica-Bold', color: INK },
    sub: { fontSize: 9, color: MUTED, marginTop: 2 },
    completed: { fontSize: 8.5, color: PAID_GREEN, marginTop: 2 },

    // totals (right-aligned block, example-style)
    totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
    totals: { width: '55%' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    totalKey: { fontSize: 10, color: BODY },
    totalVal: { fontSize: 10, color: INK },
    grandRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopColor: LINE_DARK, borderTopWidth: 1, marginTop: 10, paddingTop: 12 },
    grandLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: INK },
    grandValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: INK },

    // remittance payment details (key/value list, example-style)
    payDetails: { marginTop: 32 },
    payTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 8, paddingBottom: 8, borderBottomColor: LINE, borderBottomWidth: 1 },
    payRow: { flexDirection: 'row', marginBottom: 4 },
    payKey: { width: '32%', fontSize: 10, color: MUTED },
    payVal: { fontSize: 10, color: INK },

    selfBillNote: { fontSize: 8.5, color: MUTED, marginTop: 26 },

    footer: { position: 'absolute', bottom: 28, left: 56, right: 56, borderTopColor: LINE, borderTopWidth: 1, paddingTop: 8 },
    footerText: { fontSize: 7.5, color: MUTED, textAlign: 'center' },
})

// ---------------------------------------------------------------------------
// The document component.
// ---------------------------------------------------------------------------
export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
    const { invoice, mentor, items, payout, variant } = data
    const isRemittance = variant === 'remittance'
    const total = fmtGBP(invoice.total_cents, invoice.currency)
    const paidDate = payout?.paid_at || invoice.paid_at

    const period = invoice.period_start && invoice.period_end
        ? `${fmtDate(invoice.period_start)} to ${fmtDate(invoice.period_end)}`
        : fmtDate(invoice.invoice_date)

    // "£187.00 Due" / "£187.00 Paid on 3 Jul 2026" / "£187.00 (Draft)"
    const headline =
        invoice.status === 'paid' || isRemittance
            ? `${total} Paid${paidDate ? ` on ${fmtDate(paidDate)}` : ''}`
            : invoice.status === 'void'
                ? `${total} (Void)`
                : invoice.status === 'draft'
                    ? `${total} (Draft)`
                    : `${total} Due`

    return (
        <Document title={invoice.invoice_number || 'Invoice'} author={ACCESS_OXBRIDGE.name}>
            <Page size="A4" style={s.page}>
                {/* Header: logo, then title + invoice number / issue date / status */}
                <Image style={s.logo} src={INVOICE_LOGO_DATA_URI} />
                <View style={s.headerRow}>
                    <Text style={s.title}>{isRemittance ? 'Remittance Advice' : 'Invoice'}</Text>
                    <View style={s.metaCols}>
                        <View style={s.metaCol}>
                            <Text style={s.metaLabel}>Invoice number</Text>
                            <Text style={s.metaValue}>{invoice.invoice_number || 'Draft'}</Text>
                        </View>
                        <View style={s.metaCol}>
                            <Text style={s.metaLabel}>Issue date</Text>
                            <Text style={s.metaValue}>{fmtDate(invoice.invoice_date)}</Text>
                        </View>
                        <View style={s.metaCol}>
                            <Text style={s.metaLabel}>Status</Text>
                            <Text style={s.metaValue}>{statusLabel(invoice.status)}</Text>
                        </View>
                    </View>
                </View>

                <View style={s.headerRule} />

                {/* Billed to / Issued by */}
                <View style={s.partiesRow}>
                    <View style={s.party}>
                        <Text style={s.partyLabel}>Billed to</Text>
                        <Text style={s.partyLine}>{ACCESS_OXBRIDGE.name}</Text>
                        {ACCESS_OXBRIDGE.addressLines.map((l, i) => (
                            <Text key={i} style={s.partyLine}>{l}</Text>
                        ))}
                        <Text style={s.partyLine}>{ACCESS_OXBRIDGE.postcode}</Text>
                    </View>
                    <View style={s.party}>
                        <Text style={s.partyLabel}>Issued by</Text>
                        <Text style={s.partyLine}>{mentor.full_name || 'Mentor'}</Text>
                        {mentor.email ? <Text style={s.partyLine}>{mentor.email}</Text> : null}
                    </View>
                </View>

                {/* Amount headline + bold info lines */}
                <Text style={s.headline}>{headline}</Text>
                <View style={s.infoLines}>
                    <Text style={s.infoLine}><Text style={s.infoKey}>Name - </Text>{mentor.full_name || 'Mentor'}</Text>
                    <Text style={s.infoLine}><Text style={s.infoKey}>Duration - </Text>{period}</Text>
                    {invoice.invoice_reference ? (
                        <Text style={s.infoLine}><Text style={s.infoKey}>Reference - </Text>{invoice.invoice_reference}</Text>
                    ) : null}
                    <Text style={s.infoLine}><Text style={s.infoKey}>Sessions - </Text>{data.completedCount} of {items.length} completed</Text>
                    {invoice.status === 'submitted' && invoice.submitted_at ? (
                        <Text style={s.infoLine}><Text style={s.infoKey}>Sent to finance - </Text>{fmtDate(invoice.submitted_at)}</Text>
                    ) : null}
                </View>

                {/* Line items */}
                <View style={s.tHead}>
                    <Text style={[s.th, s.cDate]}>Session</Text>
                    <Text style={[s.th, s.cDesc]}>Description</Text>
                    <Text style={[s.th, s.cDur]}>Duration</Text>
                    <Text style={[s.th, s.cAmt]}>Total</Text>
                </View>
                {items.map((it, i) => (
                    <View key={i} style={s.tRow} wrap={false}>
                        <View style={s.cDate}>
                            <Text style={s.strong}>{fmtDate(it.session_date)}</Text>
                            <Text style={s.sub}>{fmtTimeRange(it.scheduled_at, it.duration_minutes)}</Text>
                            {it.completed && <Text style={s.completed}>Completed</Text>}
                        </View>
                        <View style={s.cDesc}>
                            <Text style={s.strong}>{it.description || '1-1 Mentorship Session'}</Text>
                            <Text style={s.sub}>Student: {it.student_name || '—'}</Text>
                        </View>
                        <Text style={s.cDur}>{fmtDuration(it.duration_minutes)}</Text>
                        <Text style={[s.cAmt, { color: INK }]}>{fmtGBP(it.amount_cents, invoice.currency)}</Text>
                    </View>
                ))}

                {/* Totals */}
                <View style={s.totalsWrap}>
                    <View style={s.totals}>
                        <View style={s.totalRow}>
                            <Text style={s.totalKey}>Gross pay <Text style={s.sub}>(total duration {fmtDuration(data.totalMinutes)})</Text></Text>
                            <Text style={s.totalVal}>{fmtGBP(invoice.subtotal_cents, invoice.currency)}</Text>
                        </View>
                        <View style={s.totalRow}>
                            <Text style={s.totalKey}>Withholding tax</Text>
                            <Text style={s.totalVal}>-{fmtGBP(invoice.withholding_cents, invoice.currency)}</Text>
                        </View>
                        {invoice.vat_cents > 0 && (
                            <View style={s.totalRow}>
                                <Text style={s.totalKey}>VAT</Text>
                                <Text style={s.totalVal}>{fmtGBP(invoice.vat_cents, invoice.currency)}</Text>
                            </View>
                        )}
                        <View style={s.grandRow}>
                            <Text style={s.grandLabel}>{isRemittance || invoice.status === 'paid' ? 'Amount Paid' : 'Amount Due'}</Text>
                            <Text style={s.grandValue}>{total}</Text>
                        </View>
                    </View>
                </View>

                {/* Remittance: payment details */}
                {isRemittance && (
                    <View style={s.payDetails}>
                        <Text style={s.payTitle}>Payment details</Text>
                        <View style={s.payRow}>
                            <Text style={s.payKey}>Payment date</Text>
                            <Text style={s.payVal}>{fmtDate(paidDate)}</Text>
                        </View>
                        {payout?.stripe_transfer_id ? (
                            <View style={s.payRow}>
                                <Text style={s.payKey}>Stripe transfer</Text>
                                <Text style={s.payVal}>{payout.stripe_transfer_id}</Text>
                            </View>
                        ) : null}
                        {payout?.stripe_payout_id ? (
                            <View style={s.payRow}>
                                <Text style={s.payKey}>Stripe payout</Text>
                                <Text style={s.payVal}>{payout.stripe_payout_id}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                {/* Self-billing marker (HMRC requirement — must stay on the invoice) */}
                {invoice.is_self_billed && (
                    <Text style={s.selfBillNote}>
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Self-billed invoice. </Text>
                        Issued by {ACCESS_OXBRIDGE.name} on behalf of the supplier named above.
                    </Text>
                )}

                {/* Footer with company registration number */}
                <View style={s.footer} fixed>
                    <Text style={s.footerText}>
                        {ACCESS_OXBRIDGE.name} · {ACCESS_OXBRIDGE.addressLines.join(', ')} {ACCESS_OXBRIDGE.postcode}
                        {'  ·  '}Company registration no. {ACCESS_OXBRIDGE.companyRegNo}
                    </Text>
                </View>
            </Page>
        </Document>
    )
}

// ---------------------------------------------------------------------------
// Load → render → upload → record. Returns the storage path.
// ---------------------------------------------------------------------------
export async function renderInvoicePdf(
    invoiceId: string,
    variant: 'invoice' | 'remittance' = 'invoice'
): Promise<string> {
    // Untyped: mentor_invoice* tables + sessions.invoice_id aren't in the
    // generated Supabase types yet.
    const db = createAdminClient() as unknown as SupabaseClient

    // 1. Invoice.
    const { data: invoice, error: invErr } = await db
        .from('mentor_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()
    if (invErr || !invoice) throw invErr || new Error('Invoice not found')

    // 2. Items (ordered by session date).
    const { data: itemRows, error: itemsErr } = await db
        .from('mentor_invoice_items')
        .select('session_id, session_date, student_name, description, duration_minutes, amount_cents')
        .eq('invoice_id', invoiceId)
        .order('session_date', { ascending: true })
    if (itemsErr) throw itemsErr
    const items = itemRows || []

    // 3. Mentor profile (supplier).
    const { data: mentorProfile } = await db
        .from('profiles')
        .select('full_name, email')
        .eq('id', invoice.mentor_id)
        .single()

    // 4. Sessions for the exact start time + completion status (line detail).
    const sessionIds = items.map((it: any) => it.session_id).filter(Boolean)
    const sessionById: Record<string, any> = {}
    if (sessionIds.length > 0) {
        const { data: sessions } = await db
            .from('sessions')
            .select('id, scheduled_at, status, zoom_meeting_status')
            .in('id', sessionIds)
        for (const ses of sessions || []) sessionById[ses.id] = ses
    }

    // 5. Remittance needs the payout for the PAID stamp.
    let payout: InvoicePdfData['payout'] = null
    if (variant === 'remittance') {
        const { data: p } = await db
            .from('mentor_payouts')
            .select('paid_at, stripe_transfer_id, stripe_payout_id')
            .eq('invoice_id', invoiceId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        payout = p || null
    }

    const pdfItems: InvoicePdfItem[] = items.map((it: any) => {
        const ses = it.session_id ? sessionById[it.session_id] : null
        const completed = ses ? (ses.status === 'completed' || ses.zoom_meeting_status === 'ended') : true
        return {
            session_date: it.session_date,
            scheduled_at: ses?.scheduled_at ?? null,
            student_name: it.student_name,
            description: it.description,
            duration_minutes: it.duration_minutes ?? 60,
            amount_cents: it.amount_cents ?? 0,
            completed,
        }
    })

    const data: InvoicePdfData = {
        variant,
        mentor: {
            full_name: mentorProfile?.full_name || 'Mentor',
            email: mentorProfile?.email || '',
        },
        invoice: {
            invoice_number: invoice.invoice_number,
            invoice_reference: invoice.invoice_reference,
            invoice_date: invoice.invoice_date,
            period_start: invoice.period_start,
            period_end: invoice.period_end,
            status: invoice.status,
            subtotal_cents: invoice.subtotal_cents ?? 0,
            withholding_cents: invoice.withholding_cents ?? 0,
            vat_cents: invoice.vat_cents ?? 0,
            total_cents: invoice.total_cents ?? 0,
            currency: invoice.currency || 'gbp',
            is_self_billed: !!invoice.is_self_billed,
            submitted_at: invoice.submitted_at,
            paid_at: invoice.paid_at,
        },
        items: pdfItems,
        totalMinutes: pdfItems.reduce((sum, it) => sum + (it.duration_minutes || 0), 0),
        completedCount: pdfItems.filter(it => it.completed).length,
        payout,
    }

    // Render to a PDF buffer.
    const buffer = await renderToBuffer(<InvoiceDocument data={data} />)

    // Upload to the private `invoices` bucket. Path: <mentor>/<invoice>/<kind>-<ts>.pdf
    // (the first segment = mentor id, which the storage RLS policy checks).
    const path = `${invoice.mentor_id}/${invoiceId}/${variant}-${Date.now()}.pdf`
    const { error: uploadErr } = await db.storage
        .from('invoices')
        .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) throw uploadErr

    // Record the document.
    const { error: docErr } = await db
        .from('mentor_invoice_documents')
        .insert({ invoice_id: invoiceId, kind: variant, pdf_path: path })
    if (docErr) throw docErr

    return path
}
