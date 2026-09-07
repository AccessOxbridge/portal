'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Minus, Plus, X } from 'lucide-react'
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
            <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-gray-900">Adjust hours</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    {studentName}
                    {studentEmail ? ` · ${studentEmail}` : ''}
                </p>

                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-5">
                    <span className="text-sm text-gray-500">Current balance</span>
                    <span className="text-lg font-bold text-gray-900">
                        {currentCredits} {currentCredits === 1 ? 'hour' : 'hours'}
                    </span>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Change</label>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setDelta((d) => Math.max(-MAX_DELTA, d - 1))}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                        aria-label="Decrease"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <input
                        type="number"
                        value={delta}
                        onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
                        className="w-24 text-center px-3 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => setDelta((d) => Math.min(MAX_DELTA, d + 1))}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                        aria-label="Increase"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-500">
                        → new balance <span className="font-bold text-gray-900">{projected}</span>
                    </span>
                </div>
                {currentCredits + delta < 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                        That would go below zero — the balance will be floored at 0 and the ledger
                        will record the requested amount.
                    </p>
                )}
                {!deltaOk && (
                    <p className="mt-2 text-xs text-gray-500">
                        Enter a non-zero whole number between -{MAX_DELTA} and {MAX_DELTA}.
                    </p>
                )}

                <label className="block text-sm font-medium text-gray-700 mt-5 mb-2">
                    Reason <span className="text-gray-400 font-normal">(required, recorded permanently)</span>
                </label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. Paid £89 by bank transfer on 5 Sept, ref AO-1043"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                />

                {error && (
                    <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Apply adjustment'}
                    </button>
                </div>

                <div className="mt-7 pt-5 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Credit history
                    </h4>
                    {history === null ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">No credit activity yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {history.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="flex items-start justify-between gap-3 text-sm"
                                >
                                    <div className="min-w-0">
                                        <span className="font-medium text-gray-900">
                                            {TYPE_LABELS[entry.type] || entry.type}
                                        </span>
                                        {entry.admin_name && (
                                            <span className="text-gray-400"> · {entry.admin_name}</span>
                                        )}
                                        {entry.description && (
                                            <p className="text-xs text-gray-500 truncate">
                                                {entry.description}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-400">
                                            {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span
                                            className={`font-bold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                                        >
                                            {entry.amount >= 0 ? '+' : ''}
                                            {entry.amount}
                                        </span>
                                        <p className="text-[10px] text-gray-400">→ {entry.balance_after}</p>
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
