'use client'

import { useMemo, useState } from 'react'
import {
    WarningCircle as AlertCircle,
    CheckCircle as CheckCircle2,
    Copy,
    Lock,
    ArrowCounterClockwise as RefreshCcw,
    FloppyDisk as Save,
    MagnifyingGlass as Search,
    VideoCamera as Video,
} from '@phosphor-icons/react/ssr'

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
            return 'bg-tint-blue text-tint-blue-foreground'
        case 'cancelled':
            return 'bg-tint-rose text-tint-rose-foreground'
        case 'active':
            return 'bg-tint-green text-tint-green-foreground'
        default:
            return 'bg-muted text-foreground'
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
            <div className="bg-card rounded-card border border-border p-12 text-center">
                <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="size-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    No finished sessions
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    Completed sessions will appear here so you can set one-off payouts before invoicing.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex gap-2 p-1.5 bg-muted rounded-card w-fit flex-wrap">
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
                            className={`px-4 py-2 rounded-control text-sm font-semibold transition-[background-color,box-shadow,color] duration-150 ${
                                filter === key
                                    ? 'bg-card text-primary shadow-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search student, mentor, or session id…"
                        value={search}
                        onChange={(e) => setSearchAndReset(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                    />
                </div>
            </div>

            <div className="bg-card rounded-card border border-border overflow-x-auto">
                <table className="w-full min-w-[960px]">
                    <thead className="bg-muted/60 border-b border-border">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                                Student
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                                Mentor
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                                Timing
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                                Dur
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                                Session ID
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                                Status
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">
                                £/hr
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">
                                Payout
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
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
                                    className="hover:bg-muted/60 transition-colors align-top"
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
                                                {session.studentName?.[0] || 'S'}
                                            </div>
                                            <span className="text-sm font-semibold text-foreground">
                                                {session.studentName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-foreground">
                                        {session.mentorName}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-foreground whitespace-nowrap">
                                        {formatDateTime(session.scheduledAt)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                                        {fmtDur(session.durationMinutes)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            type="button"
                                            onClick={() => copyId(session.id)}
                                            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary"
                                            title={session.id}
                                        >
                                            {session.id.slice(0, 8)}…
                                            <Copy className="size-3" />
                                            {copiedId === session.id && (
                                                <span className="text-success font-sans">
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
                                    <td className="px-4 py-4 text-right text-sm font-medium text-foreground whitespace-nowrap">
                                        {fmtGBP(session.hourlyRateCents)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col items-end gap-2 min-w-[160px]">
                                            {session.payoutLocked ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                        <Lock className="size-3.5 text-muted-foreground" />
                                                        {fmtGBP(session.owedCents)}
                                                    </div>
                                                    <span className="text-xs text-tint-amber-foreground bg-tint-amber px-2 py-0.5 rounded-lg">
                                                        On invoice
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground">
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
                                                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5 w-24"
                                                        />
                                                    </div>
                                                    {session.overrideActive && (
                                                        <span className="text-xs text-tint-blue-foreground bg-tint-blue px-2 py-0.5 rounded-lg">
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
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold border transition-[background-color,box-shadow,color] duration-150 ${
                                                                !dirty ||
                                                                isSaving
                                                                    ? 'border-border text-muted-foreground bg-muted/60 cursor-not-allowed'
                                                                    : 'border-primary/20 bg-primary text-white hover:bg-primary/90 shadow-border'
                                                            }`}
                                                        >
                                                            {isSaving ? (
                                                                <RefreshCcw className="size-3.5 animate-spin" />
                                                            ) : (
                                                                <Save className="size-3.5" />
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
                                                                className="text-xs font-semibold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                                                            >
                                                                Reset
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
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
                                                <div className="flex items-center gap-1 text-xs text-destructive max-w-[200px] text-right">
                                                    <AlertCircle className="size-3 shrink-0" />
                                                    <span>
                                                        {errors[session.id]}
                                                    </span>
                                                </div>
                                            )}
                                            {isSuccess && !hasError && (
                                                <div className="flex items-center gap-1 text-xs text-success">
                                                    <CheckCircle2 className="size-3" />
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
                    <p className="text-sm text-muted-foreground">
                        Showing{' '}
                        <span className="font-medium text-foreground">
                            {pageStart + 1}–{pageEnd}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-foreground">
                            {totalCount}
                        </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <span>No. of rows</span>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={pageSize}
                                onChange={(e) =>
                                    setPageSizeAndReset(Number(e.target.value))
                                }
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5 w-14 text-center"
                            />
                        </label>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage(Math.max(1, safePage - 1))}
                                disabled={safePage <= 1}
                                className={`px-3 py-1.5 text-sm transition-colors ${
                                    safePage <= 1
                                        ? 'text-muted-foreground/60 cursor-not-allowed'
                                        : 'text-foreground hover:text-foreground'
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
                                            ? 'bg-primary text-white'
                                            : 'text-muted-foreground hover:bg-muted'
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
                                        ? 'text-muted-foreground/60 border-border cursor-not-allowed'
                                        : 'text-foreground border-foreground hover:bg-muted/60'
                                }`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filteredSessions.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">
                    No sessions match this filter.
                </p>
            )}
        </div>
    )
}
