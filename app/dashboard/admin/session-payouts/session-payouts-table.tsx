'use client'

import { useMemo, useState } from 'react'
import {
    AlertCircle,
    CheckCircle2,
    Copy,
    Lock,
    RefreshCcw,
    Save,
    Search,
    Video,
} from 'lucide-react'

export interface SessionPayoutRow {
    id: string
    scheduledAt: string | null
    status: string
    durationMinutes: number
    studentName: string
    mentorName: string
    mentorId: string
    invoiceId: string | null
    payoutLocked: boolean
    hourlyRateCents: number
    payoutAmountCents: number | null
    overrideActive: boolean
    owedCents: number
}

type FilterTab = 'unbilled' | 'on_invoice' | 'all'

const fmtGBP = (cents: number) =>
    new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
    }).format((cents || 0) / 100)

const fmtDur = (min: number) => {
    const h = Math.floor((min || 0) / 60)
    const m = (min || 0) % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'completed':
            return 'bg-blue-50 text-blue-700'
        case 'cancelled':
            return 'bg-red-50 text-red-700'
        case 'active':
            return 'bg-emerald-50 text-emerald-700'
        default:
            return 'bg-gray-100 text-gray-700'
    }
}

interface Props {
    sessions: SessionPayoutRow[]
}

export default function SessionPayoutsTable({ sessions: initial }: Props) {
    const [sessions, setSessions] = useState(initial)
    const [filter, setFilter] = useState<FilterTab>('unbilled')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    /** Draft GBP input as string (e.g. "70" or "70.00") keyed by session id */
    const [draftGbp, setDraftGbp] = useState<Record<string, string>>(() =>
        Object.fromEntries(
            initial.map((s) => [s.id, (s.owedCents / 100).toFixed(2)])
        )
    )
    const [saving, setSaving] = useState<Record<string, boolean>>({})
    const [errors, setErrors] = useState<Record<string, string | null>>({})
    const [success, setSuccess] = useState<Record<string, boolean>>({})
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const filteredSessions = useMemo(() => {
        const lower = search.toLowerCase()
        return sessions
            .filter((s) => {
                if (filter === 'unbilled') return !s.payoutLocked
                if (filter === 'on_invoice') return s.payoutLocked
                return true
            })
            .filter((s) => {
                if (!lower) return true
                return (
                    s.studentName.toLowerCase().includes(lower) ||
                    s.mentorName.toLowerCase().includes(lower) ||
                    s.id.toLowerCase().includes(lower)
                )
            })
            .sort((a, b) => {
                // Latest session first
                if (!a.scheduledAt) return 1
                if (!b.scheduledAt) return -1
                return (
                    new Date(b.scheduledAt).getTime() -
                    new Date(a.scheduledAt).getTime()
                )
            })
    }, [sessions, filter, search])

    const totalCount = filteredSessions.length
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const safePage = Math.min(page, totalPages)
    const pageStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize
    const pageEnd = Math.min(pageStart + pageSize, totalCount)
    const pagedSessions = filteredSessions.slice(pageStart, pageEnd)

    const pageNumbers = useMemo(() => {
        const maxButtons = 7
        if (totalPages <= maxButtons) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }
        const half = Math.floor(maxButtons / 2)
        let start = Math.max(1, safePage - half)
        let end = start + maxButtons - 1
        if (end > totalPages) {
            end = totalPages
            start = end - maxButtons + 1
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }, [totalPages, safePage])

    const setFilterAndReset = (next: FilterTab) => {
        setFilter(next)
        setPage(1)
    }

    const setSearchAndReset = (value: string) => {
        setSearch(value)
        setPage(1)
    }

    const setPageSizeAndReset = (value: number) => {
        const n = Number.isFinite(value) && value > 0 ? Math.min(100, Math.floor(value)) : 10
        setPageSize(n)
        setPage(1)
    }

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return 'TBD'
        const date = new Date(dateStr)
        const datePart = date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        const timePart = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        })
        return `${datePart} · ${timePart}`
    }

    const parseGbpToCents = (raw: string): number | null => {
        const trimmed = raw.trim().replace(/£/g, '')
        if (trimmed === '') return null
        const n = Number(trimmed)
        if (!Number.isFinite(n) || n < 0) return null
        return Math.round(n * 100)
    }

    const defaultOwedCents = (s: SessionPayoutRow) =>
        Math.round((s.durationMinutes / 60) * s.hourlyRateCents)

    const handleSave = async (session: SessionPayoutRow) => {
        if (session.payoutLocked) return

        const cents = parseGbpToCents(draftGbp[session.id] ?? '')
        if (cents === null) {
            setErrors((prev) => ({
                ...prev,
                [session.id]: 'Enter a valid amount in GBP (e.g. 70 or 70.00).',
            }))
            return
        }

        try {
            setSaving((prev) => ({ ...prev, [session.id]: true }))
            setErrors((prev) => ({ ...prev, [session.id]: null }))
            setSuccess((prev) => ({ ...prev, [session.id]: false }))

            const res = await fetch(`/api/admin/sessions/${session.id}/payout`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payout_amount_cents: cents }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to update payout')
            }

            setSessions((prev) =>
                prev.map((s) =>
                    s.id === session.id
                        ? {
                              ...s,
                              payoutAmountCents: data.payout_amount_cents,
                              overrideActive: !!data.override_active,
                              owedCents: data.owed_cents,
                          }
                        : s
                )
            )
            setDraftGbp((prev) => ({
                ...prev,
                [session.id]: ((data.owed_cents as number) / 100).toFixed(2),
            }))
            setSuccess((prev) => ({ ...prev, [session.id]: true }))
        } catch (err: any) {
            setErrors((prev) => ({
                ...prev,
                [session.id]: err?.message || 'Something went wrong.',
            }))
        } finally {
            setSaving((prev) => ({ ...prev, [session.id]: false }))
        }
    }

    const handleClear = async (session: SessionPayoutRow) => {
        if (session.payoutLocked) return

        try {
            setSaving((prev) => ({ ...prev, [session.id]: true }))
            setErrors((prev) => ({ ...prev, [session.id]: null }))
            setSuccess((prev) => ({ ...prev, [session.id]: false }))

            const res = await fetch(`/api/admin/sessions/${session.id}/payout`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payout_amount_cents: null }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to clear override')
            }

            setSessions((prev) =>
                prev.map((s) =>
                    s.id === session.id
                        ? {
                              ...s,
                              payoutAmountCents: null,
                              overrideActive: false,
                              owedCents: data.owed_cents,
                          }
                        : s
                )
            )
            setDraftGbp((prev) => ({
                ...prev,
                [session.id]: ((data.owed_cents as number) / 100).toFixed(2),
            }))
            setSuccess((prev) => ({ ...prev, [session.id]: true }))
        } catch (err: any) {
            setErrors((prev) => ({
                ...prev,
                [session.id]: err?.message || 'Something went wrong.',
            }))
        } finally {
            setSaving((prev) => ({ ...prev, [session.id]: false }))
        }
    }

    const copyId = async (id: string) => {
        try {
            await navigator.clipboard.writeText(id)
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 1500)
        } catch {
            /* ignore */
        }
    }

    if (sessions.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No finished sessions
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    Completed sessions will appear here so you can set one-off payouts before invoicing.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit flex-wrap">
                    {(
                        [
                            ['unbilled', 'Unbilled'],
                            ['on_invoice', 'On invoice'],
                            ['all', 'All finished'],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilterAndReset(key)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                filter === key
                                    ? 'bg-white text-accent shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student, mentor, or session id…"
                        value={search}
                        onChange={(e) => setSearchAndReset(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[960px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Student
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Mentor
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Timing
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Dur
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Session ID
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Status
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                £/hr
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Payout
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pagedSessions.map((session) => {
                            const isSaving = !!saving[session.id]
                            const hasError = !!errors[session.id]
                            const isSuccess = !!success[session.id]
                            const draftCents = parseGbpToCents(
                                draftGbp[session.id] ?? ''
                            )
                            const dirty =
                                !session.payoutLocked &&
                                draftCents !== null &&
                                draftCents !== session.owedCents

                            return (
                                <tr
                                    key={session.id}
                                    className="hover:bg-gray-50 transition-colors align-top"
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold shrink-0">
                                                {session.studentName?.[0] || 'S'}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {session.studentName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-800">
                                        {session.mentorName}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                                        {formatDateTime(session.scheduledAt)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                                        {fmtDur(session.durationMinutes)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            type="button"
                                            onClick={() => copyId(session.id)}
                                            className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-accent"
                                            title={session.id}
                                        >
                                            {session.id.slice(0, 8)}…
                                            <Copy className="w-3 h-3" />
                                            {copiedId === session.id && (
                                                <span className="text-emerald-600 font-sans">
                                                    Copied
                                                </span>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClasses(session.status)}`}
                                        >
                                            {session.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right text-sm font-medium text-gray-700 whitespace-nowrap">
                                        {fmtGBP(session.hourlyRateCents)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col items-end gap-2 min-w-[160px]">
                                            {session.payoutLocked ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                                                        {fmtGBP(session.owedCents)}
                                                    </div>
                                                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">
                                                        On invoice
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-400">
                                                            £
                                                        </span>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={
                                                                draftGbp[
                                                                    session.id
                                                                ] ?? ''
                                                            }
                                                            onChange={(e) => {
                                                                setDraftGbp(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [session.id]:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    })
                                                                )
                                                                setErrors(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [session.id]:
                                                                            null,
                                                                    })
                                                                )
                                                                setSuccess(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [session.id]:
                                                                            false,
                                                                    })
                                                                )
                                                            }}
                                                            className="w-24 text-right bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
                                                        />
                                                    </div>
                                                    {session.overrideActive && (
                                                        <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                                                            Override
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                !dirty ||
                                                                isSaving
                                                            }
                                                            onClick={() =>
                                                                handleSave(
                                                                    session
                                                                )
                                                            }
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                                                !dirty ||
                                                                isSaving
                                                                    ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                                                                    : 'border-accent/20 bg-accent text-white hover:bg-accent/90 shadow-sm'
                                                            }`}
                                                        >
                                                            {isSaving ? (
                                                                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Save className="w-3.5 h-3.5" />
                                                            )}
                                                            Save
                                                        </button>
                                                        {session.overrideActive && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    isSaving
                                                                }
                                                                onClick={() =>
                                                                    handleClear(
                                                                        session
                                                                    )
                                                                }
                                                                className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline disabled:opacity-50"
                                                            >
                                                                Reset
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-400">
                                                        Default{' '}
                                                        {fmtGBP(
                                                            defaultOwedCents(
                                                                session
                                                            )
                                                        )}
                                                    </p>
                                                </>
                                            )}
                                            {hasError && (
                                                <div className="flex items-center gap-1 text-xs text-red-600 max-w-[200px] text-right">
                                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                                    <span>
                                                        {errors[session.id]}
                                                    </span>
                                                </div>
                                            )}
                                            {isSuccess && !hasError && (
                                                <div className="flex items-center gap-1 text-xs text-emerald-600">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span>Saved</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1 py-2">
                    <p className="text-sm text-gray-500">
                        Showing{' '}
                        <span className="font-medium text-gray-700">
                            {pageStart + 1}–{pageEnd}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-gray-700">
                            {totalCount}
                        </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                            <span>No. of Rows</span>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={pageSize}
                                onChange={(e) =>
                                    setPageSizeAndReset(Number(e.target.value))
                                }
                                className="w-14 text-center bg-white border border-gray-300 rounded px-1.5 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </label>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage(Math.max(1, safePage - 1))}
                                disabled={safePage <= 1}
                                className={`px-3 py-1.5 text-sm transition-colors ${
                                    safePage <= 1
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-700 hover:text-gray-900'
                                }`}
                            >
                                Previous
                            </button>
                            {pageNumbers.map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setPage(n)}
                                    className={`min-w-8 h-8 px-2 rounded-full text-sm font-medium transition-colors ${
                                        n === safePage
                                            ? 'bg-accent text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    setPage(Math.min(totalPages, safePage + 1))
                                }
                                disabled={safePage >= totalPages}
                                className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                                    safePage >= totalPages
                                        ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                                        : 'text-gray-800 border-gray-800 hover:bg-gray-50'
                                }`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filteredSessions.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-6">
                    No sessions match this filter.
                </p>
            )}
        </div>
    )
}
