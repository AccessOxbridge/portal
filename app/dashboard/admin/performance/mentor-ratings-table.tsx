import { Flag, Star } from '@phosphor-icons/react/ssr'
import { format } from 'date-fns'
import type { MentorRatingRow } from './data'

function averageColor(average: number) {
    if (average >= 4.5) return 'text-success'
    if (average >= 4) return 'text-success'
    if (average >= 3) return 'text-warning'
    return 'text-destructive'
}

export default function MentorRatingsTable({ rows }: { rows: MentorRatingRow[] }) {
    if (rows.length === 0) {
        return (
            <div className="bg-card rounded-card border border-border p-10 text-center text-muted-foreground">
                No mentors have taught or been rated yet.
            </div>
        )
    }

    return (
        <div className="bg-card rounded-card border border-border overflow-x-auto">
            <table className="w-full min-w-[760px]">
                <thead className="bg-muted/60 border-b border-border">
                    <tr>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Mentor</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Average</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Ratings</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Lowest, last 30 days</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Students</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Sessions</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Last rated</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((row) => {
                        const { rating } = row
                        return (
                            <tr
                                key={row.mentorId}
                                className={rating.flagged ? 'bg-tint-rose/60 hover:bg-tint-rose' : 'hover:bg-muted/60'}
                            >
                                <td className="px-6 py-4 align-top">
                                    <div className="font-medium text-foreground flex items-center gap-2">
                                        {row.name}
                                        {rating.flagged && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tint-rose text-tint-rose-foreground">
                                                <Flag className="size-3" />
                                                Follow up
                                            </span>
                                        )}
                                    </div>
                                    {rating.reasons.length > 0 && (
                                        <ul className="mt-1 text-xs text-tint-rose-foreground space-y-0.5">
                                            {rating.reasons.map((reason) => (
                                                <li key={reason}>{reason}</li>
                                            ))}
                                        </ul>
                                    )}
                                </td>
                                <td className="px-6 py-4 align-top">
                                    {rating.average === null ? (
                                        <span className="text-sm text-muted-foreground">No ratings yet</span>
                                    ) : (
                                        <span
                                            className={`inline-flex items-center gap-1 font-semibold tabular-nums ${averageColor(rating.average)}`}
                                        >
                                            <Star weight="fill" className="size-4 fill-current" />
                                            {rating.average.toFixed(1)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 align-top text-foreground tabular-nums">{rating.count}</td>
                                <td className="px-6 py-4 align-top tabular-nums">
                                    {rating.lowestRecent === null ? (
                                        <span className="text-sm text-muted-foreground">None</span>
                                    ) : (
                                        <span className={`font-semibold ${averageColor(rating.lowestRecent)}`}>
                                            {rating.lowestRecent}
                                            <span className="text-xs font-normal text-muted-foreground">
                                                {' '}
                                                ({rating.recentCount} {rating.recentCount === 1 ? 'rating' : 'ratings'})
                                            </span>
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 align-top text-foreground tabular-nums">{row.currentStudents}</td>
                                <td className="px-6 py-4 align-top text-foreground tabular-nums">{row.completedSessions}</td>
                                <td className="px-6 py-4 align-top text-sm text-muted-foreground">
                                    {rating.lastRatedAt ? format(new Date(rating.lastRatedAt), 'd MMM yyyy') : 'None'}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
