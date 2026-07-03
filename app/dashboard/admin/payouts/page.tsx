'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
interface AdminInvoice {
    invoice_id: string
    mentor_id: string
    mentor_name: string
    mentor_email: string
    invoice_number: string | null
    invoice_reference: string | null
    invoice_date: string | null
    period_start: string | null
    period_end: string | null
    subtotal_cents: number
    withholding_cents: number
    vat_cents: number
    amount_cents: number
    currency: string
    is_self_billed: boolean
    status: 'submitted' | 'paid'
    submitted_at: string | null
    paid_at: string | null
    sessions_count: number
    total_minutes: number
    completed_count: number
    items: InvoiceItem[]
    stripe_account_id: string | null
    payouts_enabled: boolean
    ready: boolean
}
interface PayResult {
    invoice_id: string
    success: boolean
    payout_id?: string
    transfer_id?: string
    error?: string
    bank_payout_pending?: boolean
    warning?: string
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
const statusLabel = (s: string) => ({ submitted: 'Sent to Finance', paid: 'Paid' } as Record<string, string>)[s] || s
const badgeClass = (s: string) => ({
    submitted: 'bg-indigo-100 text-indigo-700',
    paid: 'bg-green-100 text-green-700',
} as Record<string, string>)[s] || 'bg-gray-100 text-gray-700'

function StatusBadge({ status }: { status: string }) {
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass(status)}`}>{statusLabel(status)}</span>
}

export default function AdminPayoutsPage() {
    const [invoices, setInvoices] = useState<AdminInvoice[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [picked, setPicked] = useState<Set<string>>(new Set())
    const [processing, setProcessing] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [results, setResults] = useState<PayResult[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    // filters
    const [fStatus, setFStatus] = useState('submitted')
    const [fPeriod, setFPeriod] = useState('all')
    const [fCountry, setFCountry] = useState('all')

    const load = useCallback(async (keepSelection = false) => {
        setLoading(true); setError(null)
        try {
            const res = await fetch('/api/admin/payouts')
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Failed to load invoices'); return }
            const list: AdminInvoice[] = json.invoices || []
            setInvoices(list)
            if (!keepSelection) setSelectedId(prev => prev || (list.find(i => i.status === 'submitted')?.invoice_id ?? list[0]?.invoice_id ?? null))
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = useMemo(() => {
        const now = Date.now()
        return invoices.filter(inv => {
            if (fStatus !== 'all' && inv.status !== fStatus) return false
            if (fCountry !== 'all' && fCountry !== 'uk') return false
            if (fPeriod !== 'all') {
                const ref = inv.invoice_date || inv.submitted_at || inv.paid_at
                const t = ref ? new Date(ref).getTime() : 0
                if (fPeriod === '30d' && now - t > 30 * 86400000) return false
                if (fPeriod === 'year' && (!ref || new Date(ref).getFullYear() !== new Date().getFullYear())) return false
            }
            return true
        })
    }, [invoices, fStatus, fPeriod, fCountry])

    const selected = useMemo(() => invoices.find(i => i.invoice_id === selectedId) || null, [invoices, selectedId])
    const resetFilters = () => { setFStatus('submitted'); setFPeriod('all'); setFCountry('all') }

    // Only submitted + Stripe-ready invoices can be paid.
    const payable = (inv: AdminInvoice) => inv.status === 'submitted' && inv.ready
    const togglePick = (id: string) => setPicked(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
    })
    const pickedInvoices = useMemo(() => invoices.filter(i => picked.has(i.invoice_id) && payable(i)), [invoices, picked])
    const pickedTotal = pickedInvoices.reduce((s, i) => s + i.amount_cents, 0)
    const pickedMentors = new Set(pickedInvoices.map(i => i.mentor_id)).size
    const pickedSessions = pickedInvoices.reduce((s, i) => s + i.sessions_count, 0)

    const selectAllVisible = () => {
        const ids = filtered.filter(payable).map(i => i.invoice_id)
        setPicked(new Set(ids))
    }

    const doPay = async () => {
        setConfirming(false); setProcessing(true); setError(null); setResults(null)
        try {
            const invoice_ids = pickedInvoices.map(i => i.invoice_id)
            const res = await fetch('/api/admin/payouts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoice_ids }),
            })
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Failed to process payouts'); return }
            setResults(json.results || [])
            setPicked(new Set())
            await load(true)
        } finally { setProcessing(false) }
    }

    const resultById = useMemo(() => {
        const m: Record<string, PayResult> = {}
        for (const r of results || []) m[r.invoice_id] = r
        return m
    }, [results])

    const voidInvoice = async (inv: AdminInvoice) => {
        const label = inv.invoice_number || inv.invoice_reference || 'this invoice'
        if (!confirm(`Void ${label}? The mentor's sessions return to their unbilled list so they can reissue a corrected invoice. This cannot be undone.`)) return
        setProcessing(true); setError(null)
        try {
            const res = await fetch(`/api/admin/invoices/${inv.invoice_id}/void`, { method: 'POST' })
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Failed to void invoice'); return }
            setSelectedId(null)
            setPicked(prev => { const n = new Set(prev); n.delete(inv.invoice_id); return n })
            await load(true)
        } finally { setProcessing(false) }
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">Mentor Payouts</h1>
                <p className="mt-2 text-gray-500 text-lg">Pay the invoices mentors have sent to finance</p>
            </header>

            {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{error}</div>}

            {/* Per-invoice results summary */}
            {results && results.length > 0 && (
                <div className="p-5 bg-white border border-gray-100 rounded-[24px] shadow-lg space-y-2">
                    <h3 className="font-bold text-gray-900">Payout results</h3>
                    {results.map(r => {
                        const inv = invoices.find(i => i.invoice_id === r.invoice_id)
                        const label = inv?.invoice_number || inv?.mentor_name || r.invoice_id.slice(0, 8)
                        return (
                            <div key={r.invoice_id} className={`text-sm px-3 py-2 rounded-lg ${r.success ? (r.bank_payout_pending ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800') : 'bg-red-50 text-red-700'}`}>
                                <span className="font-semibold">{label}</span>{' — '}
                                {r.success
                                    ? (r.bank_payout_pending ? `paid (transfer ok) ⚠️ bank payout pending: ${r.warning}` : 'paid ✓')
                                    : `failed: ${r.error}`}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Filters + batch action bar */}
            <div className="flex flex-wrap items-end gap-3">
                <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={[['submitted', 'Sent to Finance'], ['paid', 'Paid'], ['all', 'All']]} />
                <FilterSelect label="Period" value={fPeriod} onChange={setFPeriod} options={[['all', 'All time'], ['30d', 'Last 30 days'], ['year', 'This year']]} />
                <FilterSelect label="Billing Country" value={fCountry} onChange={setFCountry} options={[['all', 'All'], ['uk', 'United Kingdom']]} />
                <button onClick={resetFilters} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Reset</button>
                <div className="flex-1" />
                <button onClick={selectAllVisible} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Select all payable</button>
                <button
                    onClick={() => setConfirming(true)}
                    disabled={pickedInvoices.length === 0 || processing}
                    className="px-6 py-2.5 rounded-xl font-bold bg-accent text-white disabled:opacity-40 hover:opacity-90 shadow-lg"
                >
                    {processing ? 'Processing…' : `Pay selected${pickedInvoices.length ? ` (${pickedInvoices.length})` : ''}`}
                </button>
            </div>

            {/* Two-pane */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left list */}
                <div className="lg:col-span-2 space-y-3 lg:max-h-[720px] lg:overflow-y-auto pr-1">
                    {loading ? (
                        <p className="text-gray-500 p-6">Loading…</p>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 bg-gray-50 rounded-[24px] text-center text-gray-500">
                            {fStatus === 'submitted' ? 'No invoices waiting to be paid.' : 'No invoices match these filters.'}
                        </div>
                    ) : filtered.map(inv => {
                        const isSel = inv.invoice_id === selectedId
                        const canPay = payable(inv)
                        return (
                            <div key={inv.invoice_id}
                                className={`p-4 rounded-2xl border transition-all ${isSel ? 'border-indigo-300 bg-indigo-50/60 shadow-md' : 'border-gray-100 bg-white hover:shadow-md'}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-4 h-4 accent-[var(--accent,#4f46e5)] disabled:opacity-30"
                                        checked={picked.has(inv.invoice_id)}
                                        disabled={!canPay}
                                        onChange={() => togglePick(inv.invoice_id)}
                                        title={canPay ? 'Select to pay' : inv.status === 'paid' ? 'Already paid' : 'Mentor Stripe not ready'}
                                    />
                                    <button onClick={() => setSelectedId(inv.invoice_id)} className="flex-1 text-left min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{inv.mentor_name}</p>
                                                <p className="text-xs text-gray-400 truncate">{inv.invoice_number || inv.invoice_reference || 'Invoice'}</p>
                                            </div>
                                            <StatusBadge status={inv.status} />
                                        </div>
                                        <div className="flex items-center justify-between text-sm mt-2">
                                            <span className="text-gray-500">{inv.sessions_count} session{inv.sessions_count !== 1 ? 's' : ''} · {fmtDur(inv.total_minutes)}</span>
                                            <span className="font-bold text-gray-900">{fmtGBP(inv.amount_cents, inv.currency)}</span>
                                        </div>
                                        <div className="mt-2">
                                            {inv.status === 'paid' ? (
                                                <span className="text-xs text-gray-400">Paid {fmtDate(inv.paid_at)}</span>
                                            ) : inv.ready ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><span className="w-2 h-2 rounded-full bg-green-500" />Stripe connected</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500" />Stripe not set up</span>
                                            )}
                                        </div>
                                        {resultById[inv.invoice_id] && (
                                            <p className={`text-xs mt-1 ${resultById[inv.invoice_id].success ? 'text-green-600' : 'text-red-600'}`}>
                                                {resultById[inv.invoice_id].success ? (resultById[inv.invoice_id].bank_payout_pending ? '⚠️ bank payout pending' : 'paid ✓') : `failed: ${resultById[inv.invoice_id].error}`}
                                            </p>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Right detail */}
                <div className="lg:col-span-3">
                    {selected ? (
                        <InvoiceDetail inv={selected} busy={processing} onVoid={() => voidInvoice(selected)} />
                    ) : (
                        <div className="p-12 bg-gray-50 rounded-[24px] text-center text-gray-500">Select an invoice to view its details.</div>
                    )}
                </div>
            </div>

            {/* Confirmation dialog */}
            {confirming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm payout</h3>
                        <p className="text-gray-500 text-sm mb-6">This transfers funds to mentors&apos; connected accounts and cannot be undone.</p>
                        <div className="space-y-3 mb-6">
                            <Row label="Invoices" value={`${pickedInvoices.length}`} />
                            <Row label="Mentors" value={`${pickedMentors}`} />
                            <Row label="Sessions" value={`${pickedSessions}`} />
                            <div className="flex justify-between pt-3 border-t border-gray-900 font-extrabold text-lg">
                                <span>Total</span><span>{fmtGBP(pickedTotal)}</span>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirming(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
                            <button onClick={doPay} className="px-5 py-2.5 rounded-xl font-bold bg-accent text-white hover:opacity-90">Pay {fmtGBP(pickedTotal)}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return <div className="flex justify-between text-sm"><span className="text-gray-500">{label}</span><span className="font-semibold text-gray-900">{value}</span></div>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
    return (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
        </div>
    )
}

function InvoiceDetail({ inv, busy, onVoid }: { inv: AdminInvoice; busy: boolean; onVoid: () => void }) {
    const period = inv.period_start && inv.period_end ? `${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}` : fmtDate(inv.invoice_date)
    return (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-lg p-8">
            {inv.is_self_billed && (
                <div className="mb-4 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold tracking-widest inline-block">SELF-BILLING</div>
            )}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-2xl font-extrabold text-gray-900">{inv.status === 'paid' ? 'Remittance' : 'Invoice'}</h3>
                    <p className="text-sm text-gray-500 mt-1">{period}</p>
                    <p className="text-sm text-gray-500">{inv.completed_count} of {inv.sessions_count} completed</p>
                </div>
                <div className="text-right">
                    <StatusBadge status={inv.status} />
                    <p className="text-xs text-gray-400 mt-2">{inv.status === 'paid' ? `Paid ${fmtDate(inv.paid_at)}` : `Sent ${fmtDate(inv.submitted_at)}`}</p>
                </div>
            </div>

            <div className="border-t border-gray-100 my-6" />

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">From</p>
                    <p className="font-bold text-gray-900">{inv.mentor_name}</p>
                    <p className="text-gray-600 text-sm">{inv.mentor_email}</p>
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
                    <p className="font-bold text-gray-900">{BILL_TO.name}</p>
                    {BILL_TO.lines.map((l, i) => <p key={i} className="text-gray-600 text-sm">{l}</p>)}
                    <p className="text-gray-600 text-sm">{BILL_TO.postcode}</p>
                </div>
            </div>

            <div className="mt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Invoice Details</p>
                <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Invoice date</span><span>{fmtDate(inv.invoice_date)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Invoice reference</span><span>{inv.invoice_reference || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Invoice number</span><span className="font-semibold">{inv.invoice_number || '—'}</span></div>
                </div>
            </div>

            <div className="mt-6 border border-gray-100 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-4">Session</div>
                    <div className="col-span-5">Description</div>
                    <div className="col-span-1 text-right">Dur.</div>
                    <div className="col-span-2 text-right">Amount</div>
                </div>
                {inv.items.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 px-4 py-3 border-t border-gray-100 text-sm">
                        <div className="col-span-4">
                            <p className="font-medium text-gray-900">{fmtDate(it.session_date)}</p>
                            <p className="text-xs text-gray-400">{fmtTimeRange(it.scheduled_at, it.duration_minutes)}</p>
                            {it.completed && <p className="text-xs text-green-600">Completed</p>}
                        </div>
                        <div className="col-span-5">
                            <p className="font-medium text-gray-900">{it.description || '1-1 Mentorship Session'}</p>
                            <p className="text-xs text-gray-500">Student: {it.student_name || '—'}</p>
                        </div>
                        <div className="col-span-1 text-right text-gray-600">{fmtDur(it.duration_minutes)}</div>
                        <div className="col-span-2 text-right font-medium text-gray-900">{fmtGBP(it.amount_cents, inv.currency)}</div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-6">
                <div className="w-full sm:w-1/2 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span>Gross pay <span className="text-gray-400">(Total: {fmtDur(inv.total_minutes)})</span></span>
                        <span>{fmtGBP(inv.subtotal_cents, inv.currency)}</span>
                    </div>
                    <div className="flex justify-between"><span>Withholding tax</span><span>−{fmtGBP(inv.withholding_cents, inv.currency)}</span></div>
                    {inv.vat_cents > 0 && <div className="flex justify-between"><span>VAT</span><span>{fmtGBP(inv.vat_cents, inv.currency)}</span></div>}
                    <div className="flex justify-between pt-2 mt-2 border-t border-gray-900 font-extrabold text-base">
                        <span>TOTAL PAY</span><span>{fmtGBP(inv.amount_cents, inv.currency)}</span>
                    </div>
                </div>
            </div>

            {inv.status === 'paid' && (
                <div className="mt-6 border-2 border-green-600 rounded-xl p-4">
                    <p className="text-green-600 font-extrabold text-lg tracking-widest">PAID</p>
                    <p className="text-xs text-gray-600 mt-1">Payment date: {fmtDate(inv.paid_at)}</p>
                </div>
            )}

            {inv.status === 'submitted' && !inv.ready && (
                <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    This mentor hasn&apos;t completed Stripe Connect onboarding, so this invoice can&apos;t be paid yet.
                </div>
            )}

            {inv.status === 'submitted' && (
                <div className="flex justify-end mt-8">
                    <button onClick={onVoid} disabled={busy} className="px-5 py-2.5 rounded-xl font-bold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40">
                        Void invoice
                    </button>
                </div>
            )}
        </div>
    )
}
