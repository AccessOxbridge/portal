import { Flag, Star } from 'lucide-react'
import { format } from 'date-fns'
import type { MentorRatingRow } from './data'

function averageColor(average: number) {
    if (average >= 4.5) return 'text-green-600'
    if (average >= 4) return 'text-lime-600'
    if (average >= 3) return 'text-amber-600'
    return 'text-red-600'
}

export default function MentorRatingsTable({ rows }: { rows: MentorRatingRow[] }) {
    if (rows.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
                No mentors have taught or been rated yet.
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[760px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Mentor</th>
                        <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Average</th>
                        <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Ratings</th>
                        <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Lowest, last 30 days</th>
                        <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Students</th>
                        <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Sessions</th>
                        <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Last rated</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => {
                        const { rating } = row
                        return (
                            <tr
                                key={row.mentorId}
                                className={rating.flagged ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-gray-50'}
                            >
                                <td className="px-6 py-4 align-top">
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                        {row.name}
                                        {rating.flagged && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                                                <Flag className="w-3 h-3" />
                                                Follow up
                                            </span>
                                        )}
                                    </div>
                                    {rating.reasons.length > 0 && (
                                        <ul className="mt-1 text-xs text-red-700 space-y-0.5">
                                            {rating.reasons.map((reason) => (
                                                <li key={reason}>{reason}</li>
                                            ))}
                                        </ul>
                                    )}
                                </td>
                                <td className="px-6 py-4 align-top">
                                    {rating.average === null ? (
                                        <span className="text-sm text-gray-400">No ratings yet</span>
                                    ) : (
                                        <span
                                            className={`inline-flex items-center gap-1 font-bold tabular-nums ${averageColor(rating.average)}`}
                                        >
                                            <Star className="w-4 h-4 fill-current" />
                                            {rating.average.toFixed(1)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 align-top text-gray-700 tabular-nums">{rating.count}</td>
                                <td className="px-6 py-4 align-top tabular-nums">
                                    {rating.lowestRecent === null ? (
                                        <span className="text-sm text-gray-400">—</span>
                                    ) : (
                                        <span className={`font-semibold ${averageColor(rating.lowestRecent)}`}>
                                            {rating.lowestRecent}
                                            <span className="text-xs font-normal text-gray-400">
                                                {' '}
                                                ({rating.recentCount} {rating.recentCount === 1 ? 'rating' : 'ratings'})
                                            </span>
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 align-top text-gray-700 tabular-nums">{row.currentStudents}</td>
                                <td className="px-6 py-4 align-top text-gray-700 tabular-nums">{row.completedSessions}</td>
                                <td className="px-6 py-4 align-top text-sm text-gray-500">
                                    {rating.lastRatedAt ? format(new Date(rating.lastRatedAt), 'd MMM yyyy') : '—'}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
