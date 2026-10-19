'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { confirmDialog } from '@/components/ui/confirm'

// Finance won't accept an invoice under 2 hours of sessions.
const MIN_INVOICE_MINUTES = 120

// Fixed BILL-TO party (spec §8.1).
const BILL_TO = {
    name: 'Access Oxbridge Ltd',
    lines: ['20 Wenlock Road', 'London', 'United Kingdom'],
    postcode: 'N1 7GU',
}

interface InvoiceItem {
    session_id: string | null
    session_date: string | null
    scheduled_at: string | null
    student_name: string | null
    description: string | null
    duration_minutes: number
    amount_cents: number
    completed: boolean
}
interface Invoice {
    id: string
    invoice_number: string | null
    invoice_reference: string | null
    invoice_date: string | null
    period_start: string | null
    period_end: string | null
    status: 'draft' | 'submitted' | 'paid' | 'void'
    subtotal_cents: number
    withholding_cents: number
    vat_cents: number
    total_cents: number
    currency: string
    is_self_billed: boolean
    submitted_at: string | null
    paid_at: string | null
    created_at: string
    items: InvoiceItem[]
    sessions_count: number
    total_minutes: number
    completed_count: number
}
interface UnbilledSession {
    id: string
    scheduled_at: string | null
    duration_minutes: number
    student_name: string
    amount_cents: number
}
interface TooShortSession {
    id: string
    scheduled_at: string | null
    student_name: string
    actual_minutes: number
}

// ---- formatting ----
const fmtGBP = (cents: number, currency = 'gbp') =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100)
const fmtDate = (v?: string | null) => {
    if (!v) return '—'
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00Z` : v)
    return isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }).format(d)
}
const fmtTimeRange = (scheduledAt?: string | null, dur?: number) => {
    if (!scheduledAt) return ''
    const start = new Date(scheduledAt)
    if (isNaN(start.getTime())) return ''
    const end = new Date(start.getTime() + (dur ?? 60) * 60000)
    const f = (d: Date) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' }).format(d)
    return `${f(start)} – ${f(end)}`
}
const fmtDur = (min: number) => `${Math.floor((min || 0) / 60)}h ${(min || 0) % 60}m`
const statusLabel = (s: string) => ({ draft: 'Draft', submitted: 'Sent to Finance', paid: 'Paid', void: 'Void' } as Record<string, string>)[s] || s
const badgeClass = (s: string) => ({
    draft: 'bg-muted text-foreground',
    submitted: 'bg-tint-blue text-tint-blue-foreground',
    paid: 'bg-tint-green text-tint-green-foreground',
    void: 'bg-tint-rose text-tint-rose-foreground',
} as Record<string, string>)[s] || 'bg-muted text-foreground'

// Sessions under 15 real minutes on Zoom (e.g. a quick hello before moving the
// session to later). Shown so the mentor knows why they cannot be picked.
function TooShortList({ sessions }: { sessions: TooShortSession[] }) {
    if (sessions.length === 0) return null
    return (
        <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Not billable: these ran under 15 minutes on Zoom, so they don’t count as a session.</p>
            <div className="divide-y divide-border border border-border rounded-control bg-muted/40">
                {sessions.map(s => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3 text-muted-foreground">
                        <div className="flex-1 min-w-0">
                            <p className="font-medium">{fmtDate(s.scheduled_at)} <span className="text-sm">{fmtTimeRange(s.scheduled_at)}</span></p>
                            <p className="text-sm truncate">{s.student_name} · {s.actual_minutes} min on Zoom</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Not billable</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass(status)}`}>{statusLabel(status)}</span>
}

export default function InvoicingPanel({ mentorName, mentorEmail }: { mentorName: string; mentorEmail: string }) {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)

    // filters
    const [fStatus, setFStatus] = useState('all')
    const [fPeriod, setFPeriod] = useState('all')
    const [fCountry, setFCountry] = useState('all')

    // create flow
    const [creating, setCreating] = useState(false)
    const [unbilled, setUnbilled] = useState<UnbilledSession[]>([])
    const [tooShort, setTooShort] = useState<TooShortSession[]>([])
    const [unbilledLoading, setUnbilledLoading] = useState(false)
    const [picked, setPicked] = useState<Set<string>>(new Set())

    const loadInvoices = useCallback(async (selectAfter?: string) => {
        setLoading(true)
        try {
            const res = await fetch('/api/mentor/invoices')
            const json = await res.json()
            const list: Invoice[] = json.invoices || []
            setInvoices(list)
            setSelectedId(prev => selectAfter || prev || (list[0]?.id ?? null))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadInvoices() }, [loadInvoices])

    const filtered = useMemo(() => {
        const now = Date.now()
        return invoices.filter(inv => {
            if (fStatus !== 'all' && inv.status !== fStatus) return false
            if (fCountry !== 'all' && fCountry !== 'uk') return false // all invoices are UK
            if (fPeriod !== 'all') {
                const d = new Date(inv.invoice_date || inv.created_at).getTime()
                if (fPeriod === '30d' && now - d > 30 * 86400000) return false
                if (fPeriod === 'year' && new Date(inv.invoice_date || inv.created_at).getFullYear() !== new Date().getFullYear()) return false
            }
            return true
        })
    }, [invoices, fStatus, fPeriod, fCountry])

    const selected = useMemo(() => invoices.find(i => i.id === selectedId) || null, [invoices, selectedId])

    const resetFilters = () => { setFStatus('all'); setFPeriod('all'); setFCountry('all') }

    // ---- create flow ----
    const openCreate = async () => {
        setCreating(true); setPicked(new Set()); setNotice(null); setUnbilledLoading(true)
        try {
            const res = await fetch('/api/mentor/invoices/unbilled')
            const json = await res.json()
            setUnbilled(json.sessions || [])
            setTooShort(json.too_short || [])
        } finally { setUnbilledLoading(false) }
    }
    const togglePick = (id: string) => setPicked(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
    })
    const pickedTotal = useMemo(
        () => unbilled.filter(s => picked.has(s.id)).reduce((sum, s) => sum + s.amount_cents, 0),
        [unbilled, picked]
    )
    // Finance requires at least 2 hours (120 min) per invoice.
    const pickedMinutes = useMemo(
        () => unbilled.filter(s => picked.has(s.id)).reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
        [unbilled, picked]
    )
    const belowMinimum = pickedMinutes < MIN_INVOICE_MINUTES
    const generateDraft = async () => {
        if (picked.size === 0) return
        setBusy(true); setNotice(null)
        try {
            const res = await fetch('/api/mentor/invoices', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_ids: Array.from(picked) }),
            })
            const json = await res.json()
            if (!res.ok) { setNotice(json.error || "Couldn't create the invoice. Try again in a moment."); return }
            const dropped = (json.dropped_session_ids?.length || 0) + (json.already_invoiced_session_ids?.length || 0)
            if (dropped > 0) setNotice(`${dropped} session(s) were already invoiced and were skipped.`)
            setCreating(false)
            await loadInvoices(json.invoice.id)
        } finally { setBusy(false) }
    }

    // ---- draft actions ----
    const submitInvoice = async (id: string) => {
        if (!(await confirmDialog({ title: 'Send this invoice to Finance?', description: 'Once sent it is locked and cannot be edited (only voided).', confirmLabel: 'Send to Finance' }))) return
        setBusy(true); setNotice(null)
        try {
            const res = await fetch(`/api/mentor/invoices/${id}/submit`, { method: 'POST' })
            const json = await res.json()
            if (!res.ok) { setNotice(json.error || "Couldn't send the invoice. Try again in a moment."); return }
            if (json.warning) setNotice(json.warning)
            await loadInvoices(id)
        } finally { setBusy(false) }
    }
    const discardInvoice = async (id: string, status: Invoice['status']) => {
        const submitted = status === 'submitted'
        const ok = await confirmDialog({
            title: submitted ? 'Void this invoice?' : 'Discard this draft?',
            description: submitted
                ? 'It will be withdrawn from Finance and its sessions return to your unbilled list so you can re-invoice them.'
                : 'Its sessions return to your unbilled list.',
            confirmLabel: submitted ? 'Void invoice' : 'Discard draft',
            destructive: true,
        })
        if (!ok) return
        setBusy(true); setNotice(null)
        try {
            const res = await fetch(`/api/mentor/invoices/${id}/discard`, { method: 'POST' })
            const json = await res.json()
            if (!res.ok) { setNotice(json.error || "Couldn't discard the invoice. Try again in a moment."); return }
            setSelectedId(null)
            await loadInvoices()
        } finally { setBusy(false) }
    }
    const downloadPdf = async (id: string, variant: 'invoice' | 'remittance') => {
        setBusy(true); setNotice(null)
        try {
            const res = await fetch(`/api/mentor/invoices/${id}/pdf?variant=${variant}`)
            const json = await res.json()
            if (!res.ok || !json.url) { setNotice(json.error || 'PDF not available'); return }
            window.open(json.url, '_blank')
        } finally { setBusy(false) }
    }

    return (
        <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Invoices</h2>
                <button
                    onClick={openCreate}
                    className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 text-base"
                >
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Create invoice
                </button>
            </div>

            {notice && (
                <div className="mb-4 p-4 rounded-control bg-tint-amber border border-border text-tint-amber-foreground text-sm flex items-start justify-between gap-3">
                    <span>{notice}</span>
                    <button onClick={() => setNotice(null)} className="font-semibold">×</button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 mb-6">
                <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={[['all', 'All'], ['draft', 'Draft'], ['submitted', 'Sent to Finance'], ['paid', 'Paid'], ['void', 'Void']]} />
                <FilterSelect label="Period" value={fPeriod} onChange={setFPeriod} options={[['all', 'All time'], ['30d', 'Last 30 days'], ['year', 'This year']]} />
                <FilterSelect label="Billing country" value={fCountry} onChange={setFCountry} options={[['all', 'All'], ['uk', 'United Kingdom']]} />
                <button onClick={resetFilters} className="px-4 py-2.5 rounded-control text-sm font-semibold text-muted-foreground border border-border hover:bg-muted/60">Reset</button>
            </div>

            {/* Create panel */}
            {creating && (
                <div className="border border-transparent mb-6 p-6 bg-card rounded-card shadow-border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Select sessions to invoice</h3>
                        <button onClick={() => setCreating(false)} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                    {unbilledLoading ? (
                        <p className="text-muted-foreground py-6 text-center">Loading unbilled sessions…</p>
                    ) : unbilled.length === 0 ? (
                        <>
                            <p className="text-muted-foreground py-6 text-center">No unbilled sessions. Complete sessions to invoice them.</p>
                            <TooShortList sessions={tooShort} />
                        </>
                    ) : (
                        <>
                            <div className="max-h-72 overflow-y-auto divide-y divide-border border border-border rounded-control">
                                {unbilled.map(s => (
                                    <label key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 cursor-pointer">
                                        <input type="checkbox" checked={picked.has(s.id)} onChange={() => togglePick(s.id)} className="size-4 accent-[var(--accent,#4f46e5)]" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground">{fmtDate(s.scheduled_at)} <span className="text-muted-foreground text-sm">{fmtTimeRange(s.scheduled_at, s.duration_minutes)}</span></p>
                                            <p className="text-sm text-muted-foreground truncate">{s.student_name} · {fmtDur(s.duration_minutes)}</p>
                                        </div>
                                        <span className="font-semibold text-foreground">{fmtGBP(s.amount_cents)}</span>
                                    </label>
                                ))}
                            </div>
                            <TooShortList sessions={tooShort} />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                                <p className="text-sm text-muted-foreground">
                                    {picked.size} selected · <span className="font-semibold text-foreground">{fmtDur(pickedMinutes)}</span> · <span className="font-semibold text-foreground">{fmtGBP(pickedTotal)}</span>
                                    {picked.size > 0 && belowMinimum && (
                                        <span className="block text-warning mt-1">Select at least 2 hours of sessions to send an invoice to Finance.</span>
                                    )}
                                </p>
                                <button onClick={generateDraft} disabled={picked.size === 0 || busy || belowMinimum} className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm">
                                    {busy ? 'Generating…' : 'Generate draft'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Two-pane */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: card list */}
                <div className="lg:col-span-2 space-y-3 lg:max-h-[720px] lg:overflow-y-auto pr-1">
                    {loading ? (
                        <p className="text-muted-foreground p-6">Loading…</p>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 bg-muted/60 rounded-card text-center text-muted-foreground">No invoices yet.</div>
                    ) : filtered.map(inv => {
                        const isSel = inv.id === selectedId
                        return (
                            <button key={inv.id} onClick={() => setSelectedId(inv.id)}
                                className={`w-full text-left p-5 rounded-card border transition-[background-color,box-shadow,color] duration-150 ${isSel ? 'border-brand/30 bg-tint-blue/60 shadow-border' : 'border-border bg-card hover:shadow-border'}`}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground truncate">{inv.invoice_reference || `${mentorName} (draft)`}</p>
                                        <p className="text-xs text-muted-foreground">{inv.invoice_number || 'Draft (no number yet)'}</p>
                                    </div>
                                    <StatusBadge status={inv.status} />
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{fmtDur(inv.total_minutes)} · {inv.completed_count} of {inv.sessions_count} completed</span>
                                    <span className="font-semibold text-foreground">{fmtGBP(inv.total_cents, inv.currency)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {inv.status === 'paid' ? `Paid ${fmtDate(inv.paid_at)}` : inv.status === 'submitted' ? `Sent ${fmtDate(inv.submitted_at)}` : `Created ${fmtDate(inv.created_at)}`}
                                </p>
                            </button>
                        )
                    })}
                </div>

                {/* Right: detail */}
                <div className="lg:col-span-3">
                    {selected ? (
                        <InvoiceDetail
                            inv={selected}
                            mentorName={mentorName}
                            mentorEmail={mentorEmail}
                            busy={busy}
                            onSubmit={() => submitInvoice(selected.id)}
                            onDiscard={() => discardInvoice(selected.id, selected.status)}
                            onDownload={(v) => downloadPdf(selected.id, v)}
                        />
                    ) : (
                        <div className="p-12 bg-muted/60 rounded-card text-center text-muted-foreground">Select an invoice to view its details.</div>
                    )}
                </div>
            </div>
        </section>
    )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
    return (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-muted-foreground mb-1">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
        </div>
    )
}

function InvoiceDetail({ inv, mentorName, mentorEmail, busy, onSubmit, onDiscard, onDownload }: {
    inv: Invoice; mentorName: string; mentorEmail: string; busy: boolean
    onSubmit: () => void; onDiscard: () => void; onDownload: (v: 'invoice' | 'remittance') => void
}) {
    const period = inv.period_start && inv.period_end ? `${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}` : fmtDate(inv.invoice_date)
    return (
        <div className="border border-transparent bg-card rounded-card shadow-border p-5 sm:p-8">
            {inv.is_self_billed && (
                <div className="mb-4 px-3 py-1.5 rounded-lg bg-tint-amber text-tint-amber-foreground text-xs font-semibold tracking-widest inline-block">SELF-BILLING</div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-semibold text-foreground">{inv.status === 'paid' ? 'Remittance' : 'Invoice'}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{period}</p>
                    <p className="text-sm text-muted-foreground">{inv.completed_count} of {inv.sessions_count} completed</p>
                </div>
                <div className="text-right">
                    <StatusBadge status={inv.status} />
                    <p className="text-xs text-muted-foreground mt-2">
                        {inv.status === 'paid' ? `Paid ${fmtDate(inv.paid_at)}` : inv.status === 'submitted' ? `Sent ${fmtDate(inv.submitted_at)}` : ''}
                    </p>
                </div>
            </div>

            <div className="border-t border-border my-6" />

            {/* FROM / BILL TO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">From</p>
                    <p className="font-semibold text-foreground">{mentorName}</p>
                    <p className="text-muted-foreground text-sm">{mentorEmail}</p>
                </div>
                <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Bill to</p>
                    <p className="font-semibold text-foreground">{BILL_TO.name}</p>
                    {BILL_TO.lines.map((l, i) => <p key={i} className="text-muted-foreground text-sm">{l}</p>)}
                    <p className="text-muted-foreground text-sm">{BILL_TO.postcode}</p>
                </div>
            </div>

            {/* Details */}
            <div className="mt-6">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Invoice details</p>
                <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Invoice date</span><span>{fmtDate(inv.invoice_date)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Invoice reference</span><span>{inv.invoice_reference || 'Not set'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Invoice number</span><span className="font-semibold">{inv.invoice_number || '(assigned on submit)'}</span></div>
                </div>
            </div>

            {/* Line items */}
            <div className="mt-6 border border-border rounded-control overflow-hidden">
                {/* Column headers only make sense once the row is a grid (sm+). */}
                <div className="hidden sm:grid grid-cols-12 bg-muted/60 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    <div className="col-span-4">Session</div>
                    <div className="col-span-5">Description</div>
                    <div className="col-span-1 text-right">Dur.</div>
                    <div className="col-span-2 text-right">Amount</div>
                </div>
                {inv.items.map((it, i) => (
                    <div
                        key={i}
                        className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-0 px-4 py-3 border-t border-border text-sm first:border-t-0 sm:first:border-t"
                    >
                        <div className="sm:col-span-4">
                            <p className="font-medium text-foreground">{fmtDate(it.session_date)}</p>
                            <p className="text-xs text-muted-foreground">{fmtTimeRange(it.scheduled_at, it.duration_minutes)}</p>
                            {it.completed && <p className="text-xs text-success">Completed</p>}
                        </div>
                        <div className="sm:col-span-5">
                            <p className="font-medium text-foreground">{it.description || '1-1 Mentorship Session'}</p>
                            <p className="text-xs text-muted-foreground">Student: {it.student_name || 'Not set'}</p>
                        </div>
                        {/* Stacked rows need their own labels; the grid has headers. */}
                        <div className="flex items-baseline justify-between gap-3 sm:contents">
                            <span className="text-xs text-muted-foreground sm:hidden">Duration</span>
                            <span className="text-muted-foreground sm:col-span-1 sm:text-right">{fmtDur(it.duration_minutes)}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 sm:contents">
                            <span className="text-xs text-muted-foreground sm:hidden">Amount</span>
                            <span className="font-medium text-foreground sm:col-span-2 sm:text-right">{fmtGBP(it.amount_cents, inv.currency)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-6">
                <div className="w-full sm:w-1/2 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span>Gross pay <span className="text-muted-foreground">(Total: {fmtDur(inv.total_minutes)})</span></span>
                        <span>{fmtGBP(inv.subtotal_cents, inv.currency)}</span>
                    </div>
                    <div className="flex justify-between"><span>Withholding tax</span><span>−{fmtGBP(inv.withholding_cents, inv.currency)}</span></div>
                    {inv.vat_cents > 0 && <div className="flex justify-between"><span>VAT</span><span>{fmtGBP(inv.vat_cents, inv.currency)}</span></div>}
                    <div className="flex justify-between pt-2 mt-2 border-t border-foreground font-semibold text-base">
                        <span>Total pay</span><span>{fmtGBP(inv.total_cents, inv.currency)}</span>
                    </div>
                </div>
            </div>

            {/* PAID stamp */}
            {inv.status === 'paid' && (
                <div className="mt-6 border-2 border-success rounded-control p-4">
                    <p className="text-success font-semibold text-lg tracking-widest">PAID</p>
                    <p className="text-xs text-muted-foreground mt-1">Payment date: {fmtDate(inv.paid_at)}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-8">
                {inv.status === 'draft' && (
                    <>
                        <button onClick={onSubmit} disabled={busy || inv.total_minutes < MIN_INVOICE_MINUTES} className="px-5 py-2.5 rounded-control font-semibold bg-primary text-white disabled:opacity-40 hover:opacity-90">
                            {busy ? 'Working…' : 'Send to Finance'}
                        </button>
                        <button onClick={onDiscard} disabled={busy} className="px-5 py-2.5 rounded-control font-semibold text-destructive border border-border hover:bg-tint-rose disabled:opacity-40">
                            Discard
                        </button>
                        {inv.total_minutes < MIN_INVOICE_MINUTES && (
                            <p className="w-full text-sm text-warning">This invoice totals {fmtDur(inv.total_minutes)}. Finance requires at least 2 hours. Discard it and select more sessions.</p>
                        )}
                    </>
                )}
                {inv.status !== 'draft' && inv.status !== 'void' && (
                    <button onClick={() => onDownload('invoice')} disabled={busy} className="px-5 py-2.5 rounded-control font-semibold text-foreground border border-border hover:bg-muted/60 disabled:opacity-40">
                        Download invoice PDF
                    </button>
                )}
                {inv.status === 'paid' && (
                    <button onClick={() => onDownload('remittance')} disabled={busy} className="px-5 py-2.5 rounded-control font-semibold text-foreground border border-border hover:bg-muted/60 disabled:opacity-40">
                        Download remittance PDF
                    </button>
                )}
                {inv.status === 'submitted' && (
                    <button onClick={onDiscard} disabled={busy} className="px-5 py-2.5 rounded-control font-semibold text-destructive border border-border hover:bg-tint-rose disabled:opacity-40">
                        Void invoice
                    </button>
                )}
            </div>
        </div>
    )
}
