import Link from 'next/link'
import { ArrowRight, Check, VideoCameraSlash } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { PageHeader } from '@/components/ui/page-header'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import type { AdminOverview as Data } from './overview-data'

const TZ = 'Europe/London'
const gbp = (cents: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)
const card = 'rounded-card border border-transparent bg-card shadow-border'

/**
 * The admin home: what needs doing, what's coming up, and how the week is
 * going. Every number comes from AdminOverview (real rows, completed
 * sessions only). Compact density, like the rest of admin.
 */
export default function AdminOverview({ data, firstName }: { data: Data; firstName: string }) {
    const a = data.attention
    const change = data.completedLastWeek > 0 ? Math.round(((data.completedThisWeek - data.completedLastWeek) / data.completedLastWeek) * 100) : null

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="Admin home"
                description={`Welcome back, ${firstName}`}
                actions={
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {data.totals.mentors} active mentors · {data.totals.students} students · {data.totals.completedSessions} sessions completed
                    </p>
                }
            />

            <section>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Needs attention</h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Tile href="/dashboard/admin/approvals" count={a.applications} label="Mentor applications" hint="Waiting for review" />
                    <Tile href="/dashboard/admin/manage-sessions" count={a.requestsPending} label="Requests waiting" hint={a.requestsOver48h ? `${a.requestsOver48h} over 48 hours` : 'None over 48 hours'} urgent={a.requestsOver48h > 0} />
                    <Tile href="/dashboard/admin/reports" count={a.reportsOverdue} label="Reports overdue" hint="Completed sessions, last 90 days" />
                    <Tile href="/dashboard/admin/manage-sessions" count={a.upcomingNoZoom} label="No Zoom link" hint="Sessions in the next 7 days" urgent={a.upcomingNoZoom > 0} />
                    <Tile
                        href={a.openIssues || !a.openHelpRequests ? '/dashboard/admin/issues' : '/dashboard/admin/student-help'}
                        count={a.openIssues + a.openHelpRequests}
                        label="Open issues"
                        hint={`${a.openIssues} reported, ${a.openHelpRequests} help ${a.openHelpRequests === 1 ? 'request' : 'requests'}`}
                    />
                    <Tile href="/dashboard/admin/students" count={a.studentsNoHours} label="Students with 0 hours" hint="Can't book until topped up" />
                    <Tile href="/dashboard/admin/students" count={a.studentsNoMentor} label="Students without a mentor" hint="Not assigned yet" />
                    <Tile href="/dashboard/admin/payouts" count={a.invoicesToPay} label="Invoices to pay" hint={a.invoicesToPay ? `${gbp(a.invoicesToPayCents)} sent to finance` : 'Nothing sent to finance'} />
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
                <section className={cn(card, 'lg:col-span-2')}>
                    <div className="flex items-baseline justify-between px-5 pt-4 pb-3">
                        <h2 className="text-sm font-semibold text-foreground">Next 7 days</h2>
                        <Link href="/dashboard/admin/manage-sessions" className="text-sm font-medium text-brand">Manage sessions</Link>
                    </div>
                    {data.upcoming.length === 0 ? (
                        <p className="px-5 pb-5 text-sm text-muted-foreground">No sessions booked in the next 7 days.</p>
                    ) : (
                        <ul className="divide-y divide-border border-t border-border">
                            {data.upcoming.map((s) => (
                                <li key={s.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                                    <span className="w-28 shrink-0 text-muted-foreground tabular-nums">
                                        {formatDateInTz(s.at, TZ, { weekday: 'short', day: 'numeric', month: 'short' })}, {formatTimeInTz(s.at, TZ).replace(/ \w+$/, '')}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-foreground">
                                        {s.student} <span className="text-muted-foreground">with</span> {s.mentor}
                                    </span>
                                    {!s.hasZoom && (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-tint-amber px-2 py-0.5 text-xs font-medium text-tint-amber-foreground">
                                            <VideoCameraSlash className="size-3.5" /> No Zoom link
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={cn(card, 'divide-y divide-border')}>
                    <Stat label="Completed this week" value={String(data.completedThisWeek)}>
                        {change === null ? (
                            <span className="text-muted-foreground">None last week</span>
                        ) : (
                            <span className={change >= 0 ? 'text-success' : 'text-destructive'}>
                                {change >= 0 ? '+' : ''}{change}% vs last week ({data.completedLastWeek})
                            </span>
                        )}
                    </Stat>
                    <Stat label="New students this month" value={String(data.newStudentsThisMonth)} />
                    <Stat label="Hours added this month" value={String(data.hoursAddedThisMonth)}>
                        <span className="text-muted-foreground">Purchases and top-ups; {data.hoursAddedLastMonth} in {data.lastMonthLabel}</span>
                    </Stat>
                    <Stat label="Session rating, last 30 days" value={data.rating30d.average === null ? 'None' : `${data.rating30d.average.toFixed(1)} / 5`}>
                        <span className="text-muted-foreground">{data.rating30d.count} {data.rating30d.count === 1 ? 'rating' : 'ratings'}</span>
                    </Stat>
                </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
                <section className={cn(card, 'p-5 lg:col-span-2')}>
                    <h2 className="text-sm font-semibold text-foreground">Completed sessions, last 12 weeks</h2>
                    <WeeklyBars weeks={data.weekly} />
                </section>

                <section className={card}>
                    <div className="px-5 pt-4 pb-3">
                        <h2 className="text-sm font-semibold text-foreground">Students to check in on</h2>
                        <p className="text-sm text-muted-foreground">Have hours or a mentor, no sign-in for 14+ days</p>
                    </div>
                    {data.atRisk.length === 0 ? (
                        <p className="px-5 pb-5 text-sm text-muted-foreground">Everyone has signed in recently.</p>
                    ) : (
                        <ul className="divide-y divide-border border-t border-border">
                            {data.atRisk.map((s) => (
                                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                                    <span className="truncate text-foreground">{s.name}</span>
                                    <span className="shrink-0 text-muted-foreground tabular-nums">
                                        {s.lastLogin
                                            ? formatDateInTz(s.lastLogin, TZ, { day: 'numeric', month: 'short' })
                                            : data.loginTrackingSince
                                                ? `None since ${formatDateInTz(data.loginTrackingSince, TZ, { day: 'numeric', month: 'short' })}`
                                                : 'None recorded'}
                                    </span>
                                </li>
                            ))}
                            {data.atRiskTotal > data.atRisk.length && (
                                <li className="px-5 py-2.5 text-sm text-muted-foreground">and {data.atRiskTotal - data.atRisk.length} more</li>
                            )}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    )
}

function Tile({ href, count, label, hint, urgent }: { href: string; count: number; label: string; hint: string; urgent?: boolean }) {
    const clear = count === 0
    return (
        <Link
            href={href}
            className={cn(card, 'group flex flex-col p-4 outline-none transition-shadow duration-150 ease-out hover:shadow-border-hover focus-visible:ring-[3px] focus-visible:ring-ring/40')}
        >
            <span className="flex items-center justify-between gap-2">
                <span className={cn('text-2xl font-semibold tracking-tight tabular-nums', clear ? 'text-muted-foreground' : 'text-foreground')}>{count}</span>
                {clear ? (
                    <span className="grid size-5 place-items-center rounded-full bg-tint-green text-tint-green-foreground"><Check weight="bold" className="size-3" /></span>
                ) : (
                    <span className={cn('size-2 rounded-full', urgent ? 'bg-destructive' : 'bg-warning')} />
                )}
            </span>
            <span className="mt-1 text-sm font-medium text-foreground">{label}</span>
            <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                {hint}
                <ArrowRight className="size-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            </span>
        </Link>
    )
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
    return (
        <div className="px-5 py-3.5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
            {children && <p className="mt-0.5 text-xs tabular-nums">{children}</p>}
        </div>
    )
}

function WeeklyBars({ weeks }: { weeks: Data['weekly'] }) {
    const max = Math.max(1, ...weeks.map((w) => w.completed))
    return (
        <div className="mt-4 flex h-44 items-end gap-2" role="img" aria-label={`Completed sessions per week: ${weeks.map((w) => w.completed).join(', ')}`}>
            {weeks.map((w, i) => (
                <div key={w.weekStart} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs text-muted-foreground tabular-nums">{w.completed}</span>
                    <div
                        className={cn('w-full rounded-t-[4px]', i === weeks.length - 1 ? 'bg-brand' : 'bg-primary/80')}
                        style={{ height: `${Math.max(2, (w.completed / max) * 100)}%` }}
                        title={`Week of ${formatDateInTz(w.weekStart, TZ, { day: 'numeric', month: 'short' })}: ${w.completed}`}
                    />
                    <span className={cn('text-[11px] whitespace-nowrap text-muted-foreground tabular-nums', i % 3 !== 0 && 'max-sm:invisible')}>
                        {formatDateInTz(w.weekStart, TZ, { day: 'numeric', month: 'short' })}
                    </span>
                </div>
            ))}
        </div>
    )
}
