'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircleNotch as Loader2, Minus, Plus, X } from '@phosphor-icons/react/ssr'
import { format } from 'date-fns'

const MAX_DELTA = 100
const MIN_REASON = 3

interface LedgerEntry {
    id: string
    amount: number
    balance_after: number
    type: string
    description: string | null
    admin_name: string | null
    created_at: string
}

interface AdjustCreditsModalProps {
    studentId: string
    studentName: string
    studentEmail?: string | null
    currentCredits: number
    onClose: () => void
    /** Called with the new balance once the adjustment commits. */
    onSaved: (newBalance: number) => void
}

const TYPE_LABELS: Record<string, string> = {
    purchase: 'Purchase',
    booking: 'Session',
    refund: 'Refund',
    admin_adjustment: 'Admin',
    bonus: 'Bonus',
}

export function AdjustCreditsModal({
    studentId,
    studentName,
    studentEmail,
    currentCredits,
    onClose,
    onSaved,
}: AdjustCreditsModalProps) {
    const [delta, setDelta] = useState(1)
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [history, setHistory] = useState<LedgerEntry[] | null>(null)

    const projected = Math.max(0, currentCredits + delta)
    const reasonOk = reason.trim().length >= MIN_REASON
    const deltaOk = Number.isInteger(delta) && delta !== 0 && Math.abs(delta) <= MAX_DELTA
    const canSave = reasonOk && deltaOk && !saving

    const loadHistory = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/credits/history?studentId=${studentId}`)
            if (!res.ok) return
            const json = await res.json()
            setHistory(json.entries || [])
        } catch {
            // History is context, not the point of the modal — stay quiet.
        }
    }, [studentId])

    useEffect(() => {
        loadHistory()
    }, [loadHistory])

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/credits/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, delta, reason: reason.trim() }),
            })
            const json = await res.json().catch(() => ({}))

            if (!res.ok) {
                setError(json.error || 'Adjustment failed. Please try again.')
                return
            }

            onSaved(json.balanceAfter as number)
            onClose()
        } catch {
            setError('Adjustment failed. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/40 animate-in fade-in-0 duration-200 motion-reduce:animate-none" onClick={onClose} />
            <div className="border border-transparent fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-y-auto overscroll-contain bg-card rounded-sheet p-6 shadow-overlay animate-in fade-in-0 zoom-in-96 duration-200 ease-snappy motion-reduce:animate-none">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-foreground">Adjust hours</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-muted-foreground rounded-lg transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                    {studentName}
                    {studentEmail ? ` · ${studentEmail}` : ''}
                </p>

                <div className="flex items-center justify-between bg-muted/60 rounded-control px-4 py-3 mb-5">
                    <span className="text-sm text-muted-foreground">Current balance</span>
                    <span className="text-lg font-semibold text-foreground">
                        {currentCredits} {currentCredits === 1 ? 'hour' : 'hours'}
                    </span>
                </div>

                <label className="mb-1.5 block text-sm font-medium text-foreground">Change</label>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setDelta((d) => Math.max(-MAX_DELTA, d - 1))}
                        className="p-2.5 rounded-control border border-border text-muted-foreground hover:bg-muted/60"
                        aria-label="Decrease"
                    >
                        <Minus className="size-4" />
                    </button>
                    <input
                        type="number"
                        value={delta}
                        onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5 w-24 text-center"
                    />
                    <button
                        type="button"
                        onClick={() => setDelta((d) => Math.min(MAX_DELTA, d + 1))}
                        className="p-2.5 rounded-control border border-border text-muted-foreground hover:bg-muted/60"
                        aria-label="Increase"
                    >
                        <Plus className="size-4" />
                    </button>
                    <span className="text-sm text-muted-foreground">
                        → new balance <span className="font-semibold text-foreground">{projected}</span>
                    </span>
                </div>
                {currentCredits + delta < 0 && (
                    <p className="mt-2 text-xs text-warning">
                        That would go below zero — the balance will be floored at 0 and the ledger
                        will record the requested amount.
                    </p>
                )}
                {!deltaOk && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Enter a non-zero whole number between -{MAX_DELTA} and {MAX_DELTA}.
                    </p>
                )}

                <label className="block text-sm font-medium text-foreground mt-5 mb-2">
                    Reason <span className="text-muted-foreground font-normal">(required, recorded permanently)</span>
                </label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. Paid £89 by bank transfer on 5 Sept, ref AO-1043"
                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm py-2.5 px-3.5 leading-relaxed"
                />

                {error && (
                    <p className="mt-3 text-sm text-destructive bg-tint-rose border border-border rounded-control px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-control border border-border text-foreground font-medium hover:bg-muted/60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3"
                    >
                        {saving ? 'Saving...' : 'Apply adjustment'}
                    </button>
                </div>

                <div className="mt-7 pt-5 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-3">
                        Credit history
                    </h4>
                    {history === null ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                            <Loader2 className="size-4 animate-spin" /> Loading…
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No credit activity yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {history.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="flex items-start justify-between gap-3 text-sm"
                                >
                                    <div className="min-w-0">
                                        <span className="font-medium text-foreground">
                                            {TYPE_LABELS[entry.type] || entry.type}
                                        </span>
                                        {entry.admin_name && (
                                            <span className="text-muted-foreground"> · {entry.admin_name}</span>
                                        )}
                                        {entry.description && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {entry.description}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground">
                                            {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span
                                            className={`font-semibold ${entry.amount >= 0 ? 'text-success' : 'text-destructive'}`}
                                        >
                                            {entry.amount >= 0 ? '+' : ''}
                                            {entry.amount}
                                        </span>
                                        <p className="text-[10px] text-muted-foreground">→ {entry.balance_after}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    )
}
