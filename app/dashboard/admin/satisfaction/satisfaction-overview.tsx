'use client'

import { useMemo } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, MessageSquareHeart } from 'lucide-react'
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

export interface SatisfactionRow {
    studentId: string
    studentName: string
    /** The 4-session tier this survey answered for. */
    sessionCount: number
    sessionsCompleted: number | null
    portal: number
    mentoring: number
    progress: number
    comment: string | null
    submittedAt: string
}

interface SatisfactionOverviewProps {
    rows: SatisfactionRow[]
}

const METRICS = [
    { key: 'portal', label: 'Portal', colour: '#092c68' },
    { key: 'mentoring', label: 'Mentoring', colour: '#4f868e' },
    { key: 'progress', label: 'Progress', colour: '#ffb81d' },
] as const

type MetricKey = (typeof METRICS)[number]['key']

const average = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null

function scoreColour(value: number | null) {
    if (value === null) return 'text-gray-400'
    if (value >= 4.5) return 'text-green-600'
    if (value >= 4) return 'text-lime-600'
    if (value >= 3) return 'text-amber-500'
    return 'text-red-600'
}

/**
 * Averages, a trend line and the raw responses.
 *
 * The trend is the part worth having: a single 4.2 says little, but 4.2 after
 * three months of 4.7 says a great deal. It is bucketed by calendar month
 * rather than plotted per response, since a handful of answers a week is too
 * sparse to read as a line.
 */
export default function SatisfactionOverview({ rows }: SatisfactionOverviewProps) {
    const averages = useMemo(
        () =>
            Object.fromEntries(
                METRICS.map((m) => [m.key, average(rows.map((r) => r[m.key]))])
            ) as Record<MetricKey, number | null>,
        [rows]
    )

    /**
     * The direction arrow next to each average: this month's mean against
     * everything before it. Null when either side has no responses, so a first
     * month of data does not claim a trend it cannot know.
     */
    const deltas = useMemo(() => {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        const recent = rows.filter((r) => new Date(r.submittedAt).getTime() >= monthStart)
        const earlier = rows.filter((r) => new Date(r.submittedAt).getTime() < monthStart)

        return Object.fromEntries(
            METRICS.map((m) => {
                const a = average(recent.map((r) => r[m.key]))
                const b = average(earlier.map((r) => r[m.key]))
                return [m.key, a !== null && b !== null ? a - b : null]
            })
        ) as Record<MetricKey, number | null>
    }, [rows])

    const trend = useMemo(() => {
        const buckets = new Map<string, SatisfactionRow[]>()
        // Ascending, so the chart reads left to right in time order.
        const ordered = [...rows].sort(
            (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        )
        ordered.forEach((row) => {
            const d = new Date(row.submittedAt)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            buckets.set(key, [...(buckets.get(key) || []), row])
        })

        return Array.from(buckets.entries()).map(([month, monthRows]) => ({
            month: new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
                month: 'short',
                year: '2-digit',
            }),
            responses: monthRows.length,
            ...Object.fromEntries(
                METRICS.map((m) => {
                    const value = average(monthRows.map((r) => r[m.key]))
                    return [m.key, value === null ? null : Number(value.toFixed(2))]
                })
            ),
        }))
    }, [rows])

    const comments = useMemo(() => rows.filter((r) => r.comment?.trim()), [rows])

    if (rows.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                    <MessageSquareHeart className="w-7 h-7 text-accent" />
                </div>
                <p className="mt-4 font-bold text-gray-900">No check-ins yet</p>
                <p className="mt-1 text-sm text-gray-500">
                    Students are asked once they reach 4 completed sessions.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {METRICS.map((metric) => {
                    const value = averages[metric.key]
                    const delta = deltas[metric.key]
                    return (
                        <div
                            key={metric.key}
                            className="bg-white rounded-2xl border border-gray-200 p-6"
                        >
                            <p className="text-sm font-medium text-gray-500 mb-1">
                                {metric.label}
                            </p>
                            <p
                                className={`text-3xl font-black flex items-center gap-2 ${scoreColour(value)}`}
                            >
                                {value !== null ? value.toFixed(1) : '—'}
                                <span className="text-lg text-gray-400">/ 5</span>
                                {delta !== null && <TrendArrow delta={delta} />}
                            </p>
                            {delta !== null && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {delta >= 0 ? '+' : ''}
                                    {delta.toFixed(2)} vs. before this month
                                </p>
                            )}
                        </div>
                    )
                })}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Responses</p>
                    <p className="text-3xl font-black text-gray-900">{rows.length}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        from {new Set(rows.map((r) => r.studentId)).size} students
                    </p>
                </div>
            </div>

            {trend.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 mb-4">Averages over time</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                {METRICS.map((metric) => (
                                    <Line
                                        key={metric.key}
                                        type="monotone"
                                        dataKey={metric.key}
                                        name={metric.label}
                                        stroke={metric.colour}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        // Keep the line unbroken across a month
                                        // where nobody answered.
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <h2 className="font-bold text-gray-900 p-6 pb-4">All responses</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="text-left font-semibold px-6 py-3">Student</th>
                                <th className="text-left font-semibold px-6 py-3">At</th>
                                <th className="text-center font-semibold px-6 py-3">Portal</th>
                                <th className="text-center font-semibold px-6 py-3">Mentoring</th>
                                <th className="text-center font-semibold px-6 py-3">Progress</th>
                                <th className="text-left font-semibold px-6 py-3">Comment</th>
                                <th className="text-left font-semibold px-6 py-3">Submitted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map((row) => (
                                <tr key={`${row.studentId}-${row.sessionCount}`}>
                                    <td className="px-6 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                        {row.studentName}
                                    </td>
                                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                                        {row.sessionCount} sessions
                                    </td>
                                    {METRICS.map((metric) => (
                                        <td
                                            key={metric.key}
                                            className={`px-6 py-3 text-center font-bold ${scoreColour(row[metric.key])}`}
                                        >
                                            {row[metric.key]}
                                        </td>
                                    ))}
                                    <td className="px-6 py-3 text-gray-600 max-w-md">
                                        {row.comment?.trim() || (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                                        {new Date(row.submittedAt).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {comments.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 mb-4">
                        What students wrote ({comments.length})
                    </h2>
                    <div className="space-y-3">
                        {comments.map((row) => (
                            <div
                                key={`${row.studentId}-${row.sessionCount}`}
                                className="p-4 rounded-2xl bg-gray-50 border border-gray-100"
                            >
                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {row.comment}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    {row.studentName} · {row.sessionCount} sessions ·{' '}
                                    {new Date(row.submittedAt).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function TrendArrow({ delta }: { delta: number }) {
    // A tenth of a point either way is noise at these sample sizes, so it
    // reads as flat rather than as a direction.
    if (Math.abs(delta) < 0.1) return <ArrowRight className="w-5 h-5 text-gray-400" />
    return delta > 0 ? (
        <ArrowUpRight className="w-5 h-5 text-green-600" />
    ) : (
        <ArrowDownRight className="w-5 h-5 text-red-600" />
    )
}
