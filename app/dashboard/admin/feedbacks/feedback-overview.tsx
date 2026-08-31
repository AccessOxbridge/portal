'use client'

import { useMemo, useState } from 'react'
import { Star, TrendingUp } from 'lucide-react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

export interface MentorRatingSummary {
    mentorId: string
    mentorName: string
    average: number
    count: number
}

interface FeedbackOverviewProps {
    totalResponses: number
    overallAverage: number | null
    completedSessions: number
    mentors: MentorRatingSummary[]
}

/**
 * A single 5-star rating would otherwise top the leaderboard over a mentor
 * averaging 4.6 across twenty. Admins can drop the threshold to see everyone.
 */
const DEFAULT_MIN_RESPONSES = 3

function barColor(average: number) {
    if (average >= 4.5) return '#22c55e'
    if (average >= 4) return '#84cc16'
    if (average >= 3) return '#f59e0b'
    return '#ef4444'
}

export default function FeedbackOverview({
    totalResponses,
    overallAverage,
    completedSessions,
    mentors,
}: FeedbackOverviewProps) {
    const [showAll, setShowAll] = useState(false)
    const minResponses = showAll ? 1 : DEFAULT_MIN_RESPONSES

    const ranked = useMemo(
        () =>
            mentors
                .filter((m) => m.count >= minResponses)
                .sort((a, b) => b.average - a.average),
        [mentors, minResponses]
    )

    const responseRate =
        completedSessions > 0 ? Math.round((totalResponses / completedSessions) * 100) : null

    const belowThreshold = mentors.length - ranked.length

    return (
        <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total responses</p>
                    <p className="text-3xl font-black text-accent">{totalResponses}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Average rating</p>
                    <p className="text-3xl font-black text-amber-500 flex items-center gap-2">
                        {overallAverage !== null ? overallAverage.toFixed(1) : '—'}
                        <span className="text-lg text-gray-400">/ 5</span>
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Response rate</p>
                    <p className="text-3xl font-black text-gray-900">
                        {responseRate !== null ? `${responseRate}%` : '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {totalResponses} of {completedSessions} completed sessions rated
                    </p>
                </div>
            </div>

            {ranked.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-gray-400" />
                                Mentors by average rating
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {showAll
                                    ? 'Showing every mentor with at least one rating.'
                                    : `Mentors with at least ${DEFAULT_MIN_RESPONSES} ratings.`}
                            </p>
                        </div>
                        {(belowThreshold > 0 || showAll) && (
                            <button
                                type="button"
                                onClick={() => setShowAll((v) => !v)}
                                className="text-sm font-semibold text-accent hover:underline shrink-0"
                            >
                                {showAll ? 'Apply minimum' : `Show all (+${belowThreshold})`}
                            </button>
                        )}
                    </div>

                    <div style={{ height: Math.max(200, ranked.length * 44) }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={ranked}
                                layout="vertical"
                                margin={{ top: 5, right: 24, bottom: 5, left: 12 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, 5]}
                                    ticks={[0, 1, 2, 3, 4, 5]}
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="mentorName"
                                    width={140}
                                    tick={{ fontSize: 12, fill: '#374151' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e5e7eb',
                                        fontSize: 12,
                                    }}
                                    formatter={(value, _name, item: any) => {
                                        const count = item?.payload?.count ?? 0
                                        return [
                                            `${Number(value).toFixed(1)}/5 from ${count} rating${count === 1 ? '' : 's'}`,
                                            'Average',
                                        ]
                                    }}
                                />
                                <Bar dataKey="average" radius={[0, 8, 8, 0]} barSize={20}>
                                    {ranked.map((m) => (
                                        <Cell key={m.mentorId} fill={barColor(m.average)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                        {ranked.slice(0, 3).map((m, i) => (
                            <span key={m.mentorId} className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-400">#{i + 1}</span>
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="font-semibold text-gray-700">
                                    {m.mentorName}
                                </span>
                                {m.average.toFixed(1)} ({m.count})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
