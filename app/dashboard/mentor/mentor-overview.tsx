import Link from 'next/link'
import { ArrowRight, CalendarBlank, Check, ClipboardText, CurrencyGbp, Tray, VideoCamera } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { formatDateInTz, formatTimeInTz, getZonedNow } from '@/lib/timezone'
import type { MentorOverview as Data } from './overview-data'

const gbp = (cents: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100)
const card = 'rounded-card border border-transparent bg-card shadow-border'

/**
 * The mentor home: the next session, what needs doing, this month, and their
 * students. All from MentorOverview (their own rows, completed sessions
 * only). Ratings are not shown here; they stay admin-only.
 */
export default function MentorOverview({ data }: { data: Data }) {
    const tz = data.timezone
    const [next, ...later] = data.next
    const day = (iso: string) => formatDateInTz(iso, tz, { weekday: 'short', day: 'numeric', month: 'short' })
    const time = (iso: string) => formatTimeInTz(iso, tz)

    return (
        <div className="space-y-6 md:space-y-8">
            <header>
                <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
                <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Hi {data.firstName}</h1>
            </header>

            {data.onboardingIncomplete && (
                <div className="flex flex-col items-start justify-between gap-4 rounded-card bg-primary p-5 text-primary-foreground shadow-overlay sm:flex-row sm:items-center">
                    <div>
                        <p className="font-semibold">Finish your onboarding</p>
                        <p className="mt-0.5 text-sm text-primary-foreground/70">Training, contract and profile come first, then you can receive students.</p>
                    </div>
                    <Link href="/dashboard/mentor/training" className={cn(buttonVariants(), 'bg-rich-amber-accent text-primary hover:bg-rich-amber-accent/90')}>
                        Go to training
                    </Link>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
                {/* Up next: the same warm card students see. */}
                <section className="flex flex-col gap-5 rounded-card bg-tint-amber p-6 ring-1 ring-warning/30 sm:p-7 lg:col-span-2">
                    {next ? (
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                            <Avatar name={next.student} src={next.studentPhoto} size="xl" className="size-20 shrink-0 text-2xl ring-4 ring-card" />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-tint-amber-foreground">Up next</p>
                                    <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-tint-amber-foreground">{relativeDay(next.at, tz)}</span>
                                </div>
                                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground text-balance">
                                    {formatDateInTz(next.at, tz, { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                                <p className="mt-1 text-lg text-tint-amber-foreground tabular-nums">{time(next.at)} with {next.student}</p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {next.canStart ? (
                                        <a href={`/api/sessions/${next.id}/start`} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
                                            <VideoCamera weight="fill" />
                                            Start session
                                        </a>
                                    ) : (
                                        <span className="inline-flex h-11 items-center rounded-full bg-card/70 px-4 text-sm text-tint-amber-foreground">Zoom link unavailable</span>
                                    )}
                                    <Link href="/dashboard/mentor/sessions" className={buttonVariants({ variant: 'secondary' })}>View my sessions</Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                            <span className="grid size-20 shrink-0 place-items-center rounded-full bg-card text-tint-amber-foreground">
                                <CalendarBlank weight="duotone" className="size-9" />
                            </span>
                            <div>
                                <p className="text-sm font-medium text-tint-amber-foreground">Up next</p>
                                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground">No sessions booked</p>
                                <p className="mt-1 text-lg text-tint-amber-foreground">New requests from your students appear in Requests.</p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    <Link href="/dashboard/mentor/requests" className={buttonVariants()}>View requests</Link>
                                    <Link href="/dashboard/mentor/sessions" className={buttonVariants({ variant: 'secondary' })}>View my sessions</Link>
                                </div>
                            </div>
                        </div>
                    )}
                    {later.length > 0 && (
                        <ul className="divide-y divide-tint-amber-foreground/10 rounded-control bg-card/60">
                            {later.map((s) => (
                                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                    <Avatar name={s.student} src={s.studentPhoto} size="xs" />
                                    <span className="min-w-0 flex-1 truncate text-foreground">{s.student}</span>
                                    <span className="shrink-0 text-tint-amber-foreground tabular-nums">{day(s.at)}, {time(s.at)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={card}>
                    <h2 className="px-5 pt-4 pb-2 text-base font-semibold text-foreground">To do</h2>
                    <ul className="divide-y divide-border">
                        <Todo
                            href="/dashboard/mentor/requests"
                            icon={Tray}
                            count={data.requestsPending}
                            label={data.requestsPending === 1 ? 'request waiting' : 'requests waiting'}
                            hint={data.oldestRequestAt ? `Oldest from ${relativeAgo(data.oldestRequestAt)}` : 'Nothing waiting'}
                        />
                        <Todo
                            href="/dashboard/mentor/reports"
                            icon={ClipboardText}
                            count={data.reportsToWrite}
                            label={data.reportsToWrite === 1 ? 'report to write' : 'reports to write'}
                            hint="For completed sessions"
                        />
                        <Todo
                            href="/dashboard/mentor/payouts"
                            icon={CurrencyGbp}
                            count={data.readyToInvoice.sessions}
                            label={data.readyToInvoice.sessions === 1 ? 'session to invoice' : 'sessions to invoice'}
                            hint={data.readyToInvoice.sessions ? `About ${gbp(data.readyToInvoice.cents)}` : 'All invoiced'}
                        />
                    </ul>
                </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
                <section className={cn(card, 'p-5')}>
                    <h2 className="text-base font-semibold text-foreground">This month</h2>
                    <dl className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm text-muted-foreground">Sessions completed</dt>
                            <dd className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{data.month.completed}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Hours</dt>
                            <dd className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{Math.round((data.month.minutes / 60) * 10) / 10}</dd>
                        </div>
                        <div className="col-span-2">
                            <dt className="text-sm text-muted-foreground">Estimated earnings</dt>
                            <dd className="mt-0.5 text-2xl font-semibold tracking-tight text-success tabular-nums">{gbp(data.month.earningsCents)}</dd>
                            <p className="text-xs text-muted-foreground">Before invoicing; your invoice is the final amount</p>
                        </div>
                    </dl>
                    <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground tabular-nums">
                        {data.lastPayout
                            ? <>Last payout {gbp(data.lastPayout.amountCents)} on {formatDateInTz(data.lastPayout.paidAt, tz, { day: 'numeric', month: 'short' })}</>
                            : 'No payouts yet'}
                    </p>
                </section>

                <section className={cn(card, 'lg:col-span-2')}>
                    <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
                        <h2 className="text-base font-semibold text-foreground">My students</h2>
                        <Link href="/dashboard/mentor/students" className="text-sm font-medium text-brand">View all</Link>
                    </div>
                    {data.students.length === 0 ? (
                        <p className="px-5 pb-5 text-sm text-muted-foreground">No students assigned yet.</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {data.students.map((s) => (
                                <li key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                                    <Avatar name={s.name} src={s.photo} size="sm" />
                                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{s.name}</span>
                                    <span className="hidden w-36 shrink-0 text-muted-foreground tabular-nums sm:block">
                                        Last: {s.lastAt ? day(s.lastAt) : 'None'}
                                    </span>
                                    <span className={cn('w-36 shrink-0 text-right tabular-nums', s.nextAt ? 'text-foreground' : 'text-muted-foreground')}>
                                        {s.nextAt ? `Next: ${day(s.nextAt)}` : 'Not booked'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    )
}

function Todo({ href, icon: Icon, count, label, hint }: { href: string; icon: typeof Tray; count: number; label: string; hint: string }) {
    return (
        <li>
            <Link href={href} className="group flex items-center gap-3 px-5 py-3.5 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60">
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', count ? 'bg-tint-amber text-tint-amber-foreground' : 'bg-tint-green text-tint-green-foreground')}>
                    {count ? <Icon weight="duotone" className="size-5" /> : <Check weight="bold" className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground tabular-nums">{count} {label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
            </Link>
        </li>
    )
}

function relativeDay(iso: string, tz: string) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso))
    const diff = Math.round((Date.parse(day) - Date.parse(getZonedNow(tz).date)) / 86400000)
    if (diff <= 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `In ${diff} days`
}

function relativeAgo(iso: string) {
    const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
    if (hours < 1) return 'just now'
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    const days = Math.floor(hours / 24)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
}
