'use client'

import { useMemo, useState } from 'react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { PencilSimple as Pencil, Plus, MagnifyingGlass as Search } from '@phosphor-icons/react/ssr'
import { PACE_STATUS_LABEL, type PaceStatus } from '@/lib/session-frequency'
import TargetModal from './target-modal'
import type { StudentPaceRow } from './data'

type Filter = 'all' | 'behind' | 'slipping' | 'on_track' | 'no_target'

const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'behind', label: 'Behind' },
    { key: 'slipping', label: 'Slipping' },
    { key: 'on_track', label: 'On track' },
    { key: 'no_target', label: 'No target' },
]

const ON_TRACK_STATUSES: PaceStatus[] = ['on_track', 'complete', 'not_started']

const PILL: Record<PaceStatus, string> = {
    behind: 'bg-tint-rose text-tint-rose-foreground',
    slipping: 'bg-tint-amber text-tint-amber-foreground',
    on_track: 'bg-tint-green text-tint-green-foreground',
    complete: 'bg-tint-blue text-tint-blue-foreground',
    not_started: 'bg-muted text-muted-foreground',
    no_target: 'bg-muted text-muted-foreground',
}

const ROW: Partial<Record<PaceStatus, string>> = {
    behind: 'bg-tint-rose/60 hover:bg-tint-rose',
    slipping: 'bg-tint-amber/40 hover:bg-tint-amber',
}

const BAR: Record<PaceStatus, string> = {
    behind: 'bg-destructive',
    slipping: 'bg-warning',
    on_track: 'bg-success',
    complete: 'bg-brand',
    not_started: 'bg-muted',
    no_target: 'bg-muted',
}

function matches(filter: Filter, status: PaceStatus) {
    if (filter === 'all') return true
    if (filter === 'on_track') return ON_TRACK_STATUSES.includes(status)
    return filter === status
}

export default function StudentPaceTable({ rows }: { rows: StudentPaceRow[] }) {
    const [filter, setFilter] = useState<Filter>('all')
    const [search, setSearch] = useState('')
    const [editing, setEditing] = useState<StudentPaceRow | null>(null)

    const counts = useMemo(() => {
        const c: Record<Filter, number> = { all: rows.length, behind: 0, slipping: 0, on_track: 0, no_target: 0 }
        rows.forEach((r) => {
            FILTERS.forEach(({ key }) => {
                if (key !== 'all' && matches(key, r.pace.status)) c[key] += 1
            })
        })
        return c
    }, [rows])

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter(
            (r) =>
                matches(filter, r.pace.status) &&
                (!q ||
                    r.name.toLowerCase().includes(q) ||
                    (r.email || '').toLowerCase().includes(q) ||
                    r.mentorNames.some((m) => m.toLowerCase().includes(q)))
        )
    }, [rows, filter, search])

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                                filter === key
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-card text-muted-foreground border-border hover:border-border'
                            }`}
                        >
                            {label}
                            <span className={`ml-1.5 tabular-nums ${filter === key ? 'text-white/80' : 'text-muted-foreground'}`}>
                                {counts[key]}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search student or mentor"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                    />
                </div>
            </div>

            <div className="bg-card rounded-card border border-border overflow-x-auto">
                <table className="w-full min-w-[1080px]">
                    <thead className="bg-muted/60 border-b border-border">
                        <tr>
                            <th className="text-left px-5 py-4 text-sm font-semibold text-muted-foreground">Student</th>
                            <th className="text-left px-5 py-4 text-sm font-semibold text-muted-foreground">Mentor</th>
                            <th className="text-left px-5 py-4 text-sm font-semibold text-muted-foreground">Target</th>
                            <th className="text-left px-5 py-4 text-sm font-semibold text-muted-foreground">Completed vs expected</th>
                            <th className="text-left px-5 py-4 text-sm font-semibold text-muted-foreground">Last session</th>
                            <th className="text-left px-5 py-4 text-sm font-semibold text-muted-foreground">Next booked</th>
                            <th className="text-left px-5 py-4 text-sm font-semibold text-muted-foreground">Status</th>
                            <th className="px-5 py-4" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {visible.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                                    No students match.
                                </td>
                            </tr>
                        )}
                        {visible.map((row) => {
                            const { pace } = row
                            const hasExpected = pace.expected !== null && row.target !== null
                            // Nothing due yet draws an empty bar rather than a full one.
                            const pct =
                                hasExpected && pace.expected! > 0
                                    ? Math.min(100, Math.round((pace.completed / pace.expected!) * 100))
                                    : 0
                            return (
                                <tr key={row.studentId} className={ROW[pace.status] || 'hover:bg-muted/60'}>
                                    <td className="px-5 py-4 align-top">
                                        <div className="font-medium text-foreground">{row.name}</div>
                                        {row.email && <div className="text-xs text-muted-foreground">{row.email}</div>}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm text-foreground">
                                        {row.mentorNames.length > 0 ? (
                                            row.mentorNames.join(', ')
                                        ) : (
                                            <span className="text-muted-foreground">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm min-w-[190px]">
                                        {row.targetLabel ? (
                                            <>
                                                <div className="text-foreground">{row.targetLabel}</div>
                                                {row.target?.note && (
                                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                        {row.target.note}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm min-w-[180px]">
                                        {hasExpected ? (
                                            <>
                                                <div className="flex items-baseline gap-1 tabular-nums">
                                                    <span className="font-semibold text-foreground">{pace.completed}</span>
                                                    <span className="text-muted-foreground">/ {pace.expected}</span>
                                                    <span className="text-xs text-muted-foreground ml-1">{pace.windowLabel}</span>
                                                </div>
                                                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${BAR[pace.status]}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground tabular-nums">
                                                {pace.completed} completed
                                            </span>
                                        )}
                                        {row.unconfirmed > 0 && (
                                            <div
                                                className="mt-1 text-xs text-muted-foreground"
                                                title="Past sessions Zoom never marked as ended: a no-show, or a missed webhook. They don't count towards the target."
                                            >
                                                + {row.unconfirmed} unconfirmed
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm text-foreground">
                                        {row.lastCompletedAt ? (
                                            <>
                                                <div>{format(new Date(row.lastCompletedAt), 'd MMM')}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDistanceToNowStrict(new Date(row.lastCompletedAt), {
                                                        addSuffix: true,
                                                    })}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">Never</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm text-foreground">
                                        {row.nextBookedAt ? (
                                            format(new Date(row.nextBookedAt), 'd MMM, HH:mm')
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                        <span
                                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${PILL[pace.status]}`}
                                        >
                                            {PACE_STATUS_LABEL[pace.status]}
                                        </span>
                                        {pace.reasons.length > 0 && (
                                            <ul
                                                className={`mt-1.5 text-xs space-y-0.5 max-w-[220px] ${
                                                    pace.status === 'behind' ? 'text-tint-rose-foreground' : 'text-tint-amber-foreground'
                                                }`}
                                            >
                                                {pace.reasons.map((reason) => (
                                                    <li key={reason}>{reason}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-right">
                                        <button
                                            onClick={() => setEditing(row)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                                                row.target
                                                    ? 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                                                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                                            }`}
                                        >
                                            {row.target ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                                            {row.target ? 'Edit' : 'Set target'}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {editing && <TargetModal row={editing} onClose={() => setEditing(null)} />}
        </div>
    )
}
