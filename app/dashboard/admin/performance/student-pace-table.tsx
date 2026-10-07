'use client'

import { useMemo, useState } from 'react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { Pencil, Plus, Search } from 'lucide-react'
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
    behind: 'bg-red-100 text-red-700',
    slipping: 'bg-amber-100 text-amber-800',
    on_track: 'bg-green-100 text-green-700',
    complete: 'bg-blue-100 text-blue-700',
    not_started: 'bg-gray-100 text-gray-600',
    no_target: 'bg-gray-100 text-gray-500',
}

const ROW: Partial<Record<PaceStatus, string>> = {
    behind: 'bg-red-50/60 hover:bg-red-50',
    slipping: 'bg-amber-50/40 hover:bg-amber-50',
}

const BAR: Record<PaceStatus, string> = {
    behind: 'bg-red-500',
    slipping: 'bg-amber-500',
    on_track: 'bg-green-500',
    complete: 'bg-blue-500',
    not_started: 'bg-gray-300',
    no_target: 'bg-gray-300',
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
                                    ? 'bg-accent text-white border-accent'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {label}
                            <span className={`ml-1.5 tabular-nums ${filter === key ? 'text-white/80' : 'text-gray-400'}`}>
                                {counts[key]}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student or mentor"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[1080px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-5 py-4 text-sm font-bold text-gray-600">Student</th>
                            <th className="text-left px-5 py-4 text-sm font-bold text-gray-600">Mentor</th>
                            <th className="text-left px-5 py-4 text-sm font-bold text-gray-600">Target</th>
                            <th className="text-left px-5 py-4 text-sm font-bold text-gray-600">Completed vs expected</th>
                            <th className="text-left px-5 py-4 text-sm font-bold text-gray-600">Last session</th>
                            <th className="text-left px-5 py-4 text-sm font-bold text-gray-600">Next booked</th>
                            <th className="text-left px-5 py-4 text-sm font-bold text-gray-600">Status</th>
                            <th className="px-5 py-4" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {visible.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-gray-500">
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
                                <tr key={row.studentId} className={ROW[pace.status] || 'hover:bg-gray-50'}>
                                    <td className="px-5 py-4 align-top">
                                        <div className="font-medium text-gray-900">{row.name}</div>
                                        {row.email && <div className="text-xs text-gray-400">{row.email}</div>}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm text-gray-700">
                                        {row.mentorNames.length > 0 ? (
                                            row.mentorNames.join(', ')
                                        ) : (
                                            <span className="text-gray-400">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm min-w-[190px]">
                                        {row.targetLabel ? (
                                            <>
                                                <div className="text-gray-800">{row.targetLabel}</div>
                                                {row.target?.note && (
                                                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                                        {row.target.note}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm min-w-[180px]">
                                        {hasExpected ? (
                                            <>
                                                <div className="flex items-baseline gap-1 tabular-nums">
                                                    <span className="font-bold text-gray-900">{pace.completed}</span>
                                                    <span className="text-gray-400">/ {pace.expected}</span>
                                                    <span className="text-xs text-gray-400 ml-1">{pace.windowLabel}</span>
                                                </div>
                                                <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${BAR[pace.status]}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-gray-500 tabular-nums">
                                                {pace.completed} completed
                                            </span>
                                        )}
                                        {row.unconfirmed > 0 && (
                                            <div
                                                className="mt-1 text-xs text-gray-500"
                                                title="Past sessions Zoom never marked as ended: a no-show, or a missed webhook. They don't count towards the target."
                                            >
                                                + {row.unconfirmed} unconfirmed
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm text-gray-700">
                                        {row.lastCompletedAt ? (
                                            <>
                                                <div>{format(new Date(row.lastCompletedAt), 'd MMM')}</div>
                                                <div className="text-xs text-gray-400">
                                                    {formatDistanceToNowStrict(new Date(row.lastCompletedAt), {
                                                        addSuffix: true,
                                                    })}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-gray-400">Never</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top text-sm text-gray-700">
                                        {row.nextBookedAt ? (
                                            format(new Date(row.nextBookedAt), 'd MMM, HH:mm')
                                        ) : (
                                            <span className="text-gray-400">None</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                        <span
                                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${PILL[pace.status]}`}
                                        >
                                            {PACE_STATUS_LABEL[pace.status]}
                                        </span>
                                        {pace.reasons.length > 0 && (
                                            <ul
                                                className={`mt-1.5 text-xs space-y-0.5 max-w-[220px] ${
                                                    pace.status === 'behind' ? 'text-red-700' : 'text-amber-800'
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
                                                    ? 'text-gray-500 hover:text-accent hover:bg-accent/10'
                                                    : 'bg-accent/10 text-accent hover:bg-accent hover:text-white'
                                            }`}
                                        >
                                            {row.target ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
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
