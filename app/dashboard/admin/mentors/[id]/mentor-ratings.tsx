'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { Star, MessageSquare } from 'lucide-react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

/** One student rating of one session with this mentor. */
export interface MentorRating {
    sessionId: string
    rating: number
    comment: string | null
    /** Reasons the student picked when rating 1–3. */
    tags: string[]
    submittedAt: string
    sessionDate: string | null
}

interface MentorRatingsProps {
    ratings: MentorRating[]
    /** Completed sessions, used as the denominator for the response rate. */
    sessionsCompleted: number
}

// Red through amber to green: a glance at the distribution chart should tell
// you whether the mass sits at the bad end without reading the axis.
const STAR_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e']

export default function MentorRatings({ ratings, sessionsCompleted }: MentorRatingsProps) {
    const { average, distribution, trend, comments } = useMemo(() => {
        const average =
            ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : null

        const counts = [1, 2, 3, 4, 5].map((star) => ({
            star: `${star}★`,
            count: ratings.filter((r) => r.rating === star).length,
        }))

        // Oldest first so the line reads left to right in time order.
        const trend = [...ratings]
            .sort(
                (a, b) =>
                    new Date(a.sessionDate || a.submittedAt).getTime() -
                    new Date(b.sessionDate || b.submittedAt).getTime()
            )
            .map((r) => ({
                date: format(new Date(r.sessionDate || r.submittedAt), 'd MMM'),
                rating: r.rating,
            }))

        const comments = ratings
            .filter((r) => (r.comment && r.comment.trim()) || r.tags.length > 0)
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

        return { average, distribution: counts, trend, comments }
    }, [ratings])

    const responseRate =
        sessionsCompleted > 0 ? Math.round((ratings.length / sessionsCompleted) * 100) : null

    if (ratings.length === 0) {
        return (
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Feedback &amp; Ratings</h2>
                <p className="text-gray-400 text-sm">
                    No student ratings yet
                    {sessionsCompleted > 0
                        ? ` across ${sessionsCompleted} completed session${sessionsCompleted === 1 ? '' : 's'}.`
                        : '.'}
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm space-y-8">
            <div>
                <h2 className="text-lg font-bold text-gray-900">Feedback &amp; Ratings</h2>
                <p className="text-sm text-gray-500 mt-1">
                    What students said after their sessions. Visible to admins only.
                </p>
            </div>

            {/* Headline numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <span className="text-3xl font-bold text-gray-900">
                            {average!.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">/5</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wide">
                        Average rating
                    </p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                    <span className="text-3xl font-bold text-gray-900">{ratings.length}</span>
                    <p className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wide">
                        Ratings received
                    </p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                    <span className="text-3xl font-bold text-gray-900">
                        {responseRate !== null ? `${responseRate}%` : '—'}
                    </span>
                    <p className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wide">
                        Response rate
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Distribution */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Rating distribution</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis
                                    dataKey="star"
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
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
                                    formatter={(value) => [Number(value), 'Ratings']}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                    {distribution.map((entry, index) => (
                                        <Cell key={entry.star} fill={STAR_COLORS[index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Trend */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Rating over time</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[0, 5]}
                                    ticks={[1, 2, 3, 4, 5]}
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e5e7eb',
                                        fontSize: 12,
                                    }}
                                    formatter={(value) => [`${Number(value)}/5`, 'Rating']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="rating"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#f59e0b' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Written comments */}
            {comments.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        What students wrote ({comments.length})
                    </h3>
                    <div className="space-y-3">
                        {comments.map((c) => (
                            <div
                                key={c.sessionId}
                                className="border border-gray-100 rounded-2xl p-4 bg-gray-50/60"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-3.5 h-3.5 ${
                                                    star <= c.rating
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-gray-200 fill-gray-200'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {format(new Date(c.submittedAt), 'd MMM yyyy')}
                                    </span>
                                </div>
                                {c.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {c.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-medium"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {c.comment && (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.comment}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
