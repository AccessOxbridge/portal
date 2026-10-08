'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import {
    ArrowRight,
    BookOpen,
    Buildings,
    CalendarBlank,
    Check,
    Clock,
    FileText,
    PenNib,
    Plus,
    Users,
    VideoCamera,
} from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { buttonVariants } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ProgressRing, Steps } from '@/components/ui/progress'

/* Sample data: the same fields the real home already loads, nothing new. */
const D = {
    name: 'Raj',
    university: 'Cambridge',
    course: 'Computer Science',
    year: 2027,
    hours: 20,
    thisWeek: 2,
    next: { mentor: 'Eleanor Whitfield', day: 'Thursday 9 October', short: 'Thu 9 Oct', time: '17:00', relative: 'In 2 days' },
    later: { mentor: 'Eleanor Whitfield', short: 'Sat 11 Oct', time: '10:00' },
    week: [
        { d: 'Sun', n: 4, past: true },
        { d: 'Mon', n: 5, past: true },
        { d: 'Tue', n: 6, past: true },
        { d: 'Wed', n: 7, past: true },
        { d: 'Thu', n: 8, today: true },
        { d: 'Fri', n: 9, session: true },
        { d: 'Sat', n: 10, session: true },
    ],
    milestones: [
        { label: 'Personal statement', date: '30 Sept', days: 357, icon: FileText },
        { label: 'Entrance exam', date: '22 Oct', days: 379, icon: PenNib },
        { label: 'Interviews', date: '25 Nov', days: 413, icon: Users },
    ],
}

type Option = 'd' | 'a' | 'b' | 'c'
const OPTIONS: { id: Option; name: string; note: string }[] = [
    { id: 'd', name: 'A + up next', note: 'A\'s layout with B\'s warm "Up next" card at the top.' },
    { id: 'a', name: 'A. Next session first', note: 'One navy "what\'s next" card, hours beside it, then the road to your offer and the week.' },
    { id: 'b', name: 'B. Two calm columns', note: 'Like Brilliant: your week and set-up checklist on the left, one warm "up next" card on the right.' },
    { id: 'c', name: 'C. Your journey', note: 'The page is one timeline from today to interviews, with sessions and deadlines on it.' },
]

export default function HomeOptions() {
    const [option, setOption] = useState<Option>('d')
    const current = OPTIONS.find((o) => o.id === option)!

    return (
        <div className="space-y-6 pb-16">
            <div className="flex flex-wrap items-center gap-3 rounded-card bg-tint-amber px-4 py-3 text-sm text-tint-amber-foreground md:me-[300px]">
                <span className="font-medium">Preview with sample data.</span>
                <div className="inline-flex rounded-full bg-card p-1 shadow-border">
                    {OPTIONS.map((o) => (
                        <button
                            key={o.id}
                            onClick={() => setOption(o.id)}
                            className={cn(
                                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150',
                                option === o.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {o.id === 'd' ? 'A + up next' : o.id.toUpperCase()}
                        </button>
                    ))}
                </div>
                <span className="text-pretty">{current.name}: {current.note}</span>
            </div>

            {/* key: replay the first-load entrance when switching */}
            <div key={option}>
                {option === 'd' && <OptionA upNext />}
                {option === 'a' && <OptionA />}
                {option === 'b' && <OptionB />}
                {option === 'c' && <OptionC />}
            </div>
        </div>
    )
}

/* ── Shared pieces ───────────────────────────────────────────────────────── */

/** better-ui staged entrance: 100ms apart, 12px rise, 300ms ease-out; fade only under reduced motion. */
function Rise({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
    return (
        <div
            className={cn('animate-in fade-in-0 slide-in-from-bottom-3 blur-in-4 duration-300 ease-snappy fill-mode-both motion-reduce:slide-in-from-bottom-0 motion-reduce:blur-in-0', className)}
            style={{ animationDelay: `${i * 100}ms` } as CSSProperties}
        >
            {children}
        </div>
    )
}

function Greeting({ sub = true }: { sub?: boolean }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Hi {D.name}</h1>
            {sub && (
                <div className="mt-3 flex flex-wrap gap-2">
                    <Chip icon={<Buildings weight="duotone" />}>{D.university}</Chip>
                    <Chip icon={<BookOpen weight="duotone" />}>{D.course}</Chip>
                    <Chip icon={<CalendarBlank weight="duotone" />}>{D.year} entry</Chip>
                </div>
            )}
        </div>
    )
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-tint-blue px-3 py-1.5 text-sm font-medium text-tint-blue-foreground [&_svg]:size-4">
            {icon}
            {children}
        </span>
    )
}

const card = 'rounded-card border border-transparent bg-card shadow-border'
const amberButton = cn(buttonVariants(), 'bg-rich-amber-accent text-legacy-accent hover:bg-rich-amber-accent/90')

function WeekStrip({ compact = false }: { compact?: boolean }) {
    return (
        <div className="grid grid-cols-7 gap-1">
            {D.week.map((day) => (
                <div key={day.d} className="flex flex-col items-center gap-1.5">
                    <span className={cn('text-xs font-medium', day.today ? 'text-foreground' : 'text-muted-foreground')}>{day.d}</span>
                    <span
                        className={cn(
                            'grid place-items-center rounded-full font-medium tabular-nums',
                            compact ? 'size-9 text-sm' : 'size-10 text-base',
                            day.today && 'text-brand ring-2 ring-inset ring-brand',
                            day.session && 'bg-primary text-primary-foreground',
                            day.past && 'text-muted-foreground/60',
                            !day.today && !day.session && !day.past && 'border-2 border-dashed border-input text-muted-foreground',
                        )}
                    >
                        {day.n}
                    </span>
                </div>
            ))}
        </div>
    )
}

/* ── A. Next session first ───────────────────────────────────────────────── */

function OptionA({ upNext = false }: { upNext?: boolean }) {
    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <Rise i={0}><Greeting /></Rise>

            <div className="grid gap-4 md:grid-cols-3">
                <Rise i={1} className="md:col-span-2">
                    {upNext ? <UpNextCard /> : (
                    <div className="flex h-full flex-col justify-between gap-6 rounded-card bg-primary p-6 text-primary-foreground shadow-overlay sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-primary-foreground/70">Your next session</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight">{D.next.day}</p>
                                <p className="mt-1 text-lg text-primary-foreground/80 tabular-nums">{D.next.time} with {D.next.mentor}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">{D.next.relative}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button className={amberButton}>
                                <Plus weight="bold" />
                                Book another session
                            </button>
                            <a className={cn(buttonVariants({ variant: 'ghost' }), 'text-primary-foreground hover:bg-white/10')}>
                                View my sessions
                                <ArrowRight weight="bold" />
                            </a>
                        </div>
                    </div>
                    )}
                </Rise>

                <Rise i={2}>
                    <div className={cn(card, 'flex h-full flex-col items-center justify-center gap-3 p-6 text-center')}>
                        <ProgressRing value={D.hours} max={D.hours} size={104} stroke={8} label={`${D.hours} hours left`} tone="success">
                            <span className="text-3xl font-semibold tracking-tight text-foreground">{D.hours}</span>
                        </ProgressRing>
                        <div>
                            <p className="font-medium text-foreground">hours left</p>
                            <p className="text-sm text-muted-foreground">{D.thisWeek} sessions booked this week</p>
                        </div>
                    </div>
                </Rise>
            </div>

            <Rise i={3}>
                <div className={cn(card, 'p-6')}>
                    <div className="mb-6 flex items-baseline justify-between gap-3">
                        <h2 className="text-base font-semibold text-foreground">Road to {D.university}</h2>
                        <span className="text-sm text-muted-foreground">{D.year} entry</span>
                    </div>
                    <ol className="grid grid-cols-4">
                        {[{ label: 'Today', date: '8 Oct', today: true }, ...D.milestones].map((m, i, all) => (
                            <li key={m.label} className="relative flex flex-col items-center text-center">
                                {i < all.length - 1 && <span aria-hidden className="absolute top-5 left-[calc(50%+24px)] right-[calc(-50%+24px)] border-t-2 border-dashed border-input" />}
                                {'today' in m ? (
                                    <span className="relative z-10 grid size-10 place-items-center rounded-full bg-brand text-white ring-4 ring-tint-blue">
                                        <CalendarBlank weight="fill" className="size-5" />
                                    </span>
                                ) : (
                                    <span className="relative z-10 size-10 rounded-full border-2 border-dashed border-input bg-card" />
                                )}
                                <span className={cn('mt-2.5 text-sm font-medium', 'today' in m ? 'text-brand' : 'text-foreground')}>{m.label}</span>
                                <span className="text-xs text-muted-foreground tabular-nums">{m.date}</span>
                                {'days' in m && <Badge className="mt-2 tabular-nums">{m.days} days</Badge>}
                            </li>
                        ))}
                    </ol>
                </div>
            </Rise>

            <Rise i={4}>
                <div className={cn(card, 'grid gap-6 p-6 md:grid-cols-[1fr_1.1fr]')}>
                    <div>
                        <div className="mb-4 flex items-baseline justify-between">
                            <h2 className="text-base font-semibold text-foreground">October 2026</h2>
                            <span className="text-sm text-muted-foreground">This week</span>
                        </div>
                        <WeekStrip compact />
                    </div>
                    <div className="space-y-2">
                        <SessionRow day={D.next.short} time={D.next.time} mentor={D.next.mentor} />
                        <SessionRow day={D.later.short} time={D.later.time} mentor={D.later.mentor} />
                    </div>
                </div>
            </Rise>
        </div>
    )
}

/** B's warm card, laid out across A's wider slot: avatar left, details and actions beside it. */
function UpNextCard() {
    return (
        <div className="flex h-full flex-col gap-5 rounded-card bg-tint-amber p-6 ring-1 ring-warning/30 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
            <Avatar name={D.next.mentor} size="xl" className="size-20 shrink-0 text-2xl ring-4 ring-card" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-tint-amber-foreground">Up next</p>
                    <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-tint-amber-foreground">{D.next.relative}</span>
                </div>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground text-balance">{D.next.day}</p>
                <p className="mt-1 text-lg text-tint-amber-foreground tabular-nums">{D.next.time} with {D.next.mentor}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                    <button className={buttonVariants()}>
                        <Plus weight="bold" />
                        Book another session
                    </button>
                    <a className={buttonVariants({ variant: 'secondary' })}>View my sessions</a>
                </div>
            </div>
        </div>
    )
}

function SessionRow({ day, time, mentor }: { day: string; time: string; mentor: string }) {
    return (
        <div className="flex items-center gap-3 rounded-card bg-muted/60 p-3">
            <Avatar name={mentor} size="md" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">Session with {mentor}</p>
                <p className="text-sm text-muted-foreground tabular-nums">{day} · {time}</p>
            </div>
            <span className={buttonVariants({ size: 'sm', variant: 'secondary' })}>
                <VideoCamera weight="fill" />
                Join
            </span>
        </div>
    )
}

/* ── B. Two calm columns (Brilliant-like) ────────────────────────────────── */

function OptionB() {
    return (
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[minmax(0,340px)_1fr]">
            <div className="space-y-4">
                <Rise i={0}><Greeting sub={false} /></Rise>

                <Rise i={1}>
                    <div className={cn(card, 'p-5')}>
                        <div className="mb-4 flex items-baseline justify-between">
                            <p className="text-base font-semibold text-foreground">This week</p>
                            <p className="text-sm text-muted-foreground tabular-nums">{D.thisWeek} sessions</p>
                        </div>
                        <WeekStrip compact />
                    </div>
                </Rise>

                <Rise i={2}>
                    <div className={cn(card, 'p-5')}>
                        <p className="mb-4 text-base font-semibold text-foreground">Getting set up</p>
                        <Steps
                            steps={[
                                { label: 'Complete your profile', state: 'done' },
                                { label: 'Get matched with a mentor', state: 'done' },
                                { label: 'Book your first session', state: 'done' },
                                { label: 'Write your personal statement', hint: '357 days to go', state: 'current' },
                            ]}
                        />
                    </div>
                </Rise>

                <Rise i={3}>
                    <div className={cn(card, 'flex items-center gap-4 p-5')}>
                        <ProgressRing value={D.hours} max={D.hours} size={56} stroke={6} label={`${D.hours} hours left`} tone="success">
                            <Clock weight="bold" className="size-5 text-success" />
                        </ProgressRing>
                        <div>
                            <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{D.hours} hours</p>
                            <p className="text-sm text-muted-foreground">left to book</p>
                        </div>
                    </div>
                </Rise>
            </div>

            <div className="space-y-4 md:pt-[52px]">
                <Rise i={1}>
                    <p className="mb-2 text-base font-semibold text-foreground">Up next</p>
                    <div className="rounded-card bg-tint-amber p-6 ring-1 ring-warning/30 sm:p-8">
                        <div className="flex flex-col items-center text-center">
                            <Avatar name={D.next.mentor} size="xl" className="size-20 text-2xl ring-4 ring-card" />
                            <p className="mt-4 text-sm font-medium text-tint-amber-foreground">{D.next.relative}</p>
                            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{D.next.day}</p>
                            <p className="mt-1 text-lg text-tint-amber-foreground tabular-nums">{D.next.time} with {D.next.mentor}</p>
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                <button className={buttonVariants()}>
                                    <Plus weight="bold" />
                                    Book another session
                                </button>
                                <a className={buttonVariants({ variant: 'secondary' })}>View my sessions</a>
                            </div>
                        </div>
                    </div>
                </Rise>

                <Rise i={2}>
                    <div className={cn(card, 'divide-y divide-border')}>
                        <p className="px-5 pt-4 pb-3 text-base font-semibold text-foreground">Coming up</p>
                        {D.milestones.map((m) => (
                            <div key={m.label} className="flex items-center gap-3 px-5 py-3">
                                <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground"><m.icon weight="duotone" className="size-5" /></span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                                    <p className="text-sm text-muted-foreground tabular-nums">{m.date}</p>
                                </div>
                                <Badge className="tabular-nums">{m.days} days</Badge>
                            </div>
                        ))}
                    </div>
                </Rise>
            </div>
        </div>
    )
}

/* ── C. Your journey ─────────────────────────────────────────────────────── */

function OptionC() {
    return (
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_300px]">
            <div className="space-y-6">
                <Rise i={0}><Greeting /></Rise>
                <Rise i={1}>
                    <div className={cn(card, 'p-6 sm:p-7')}>
                        <div className="mb-6 flex items-baseline justify-between gap-3">
                            <h2 className="text-lg font-semibold text-foreground">Your journey to {D.university}</h2>
                            <span className="text-sm text-muted-foreground">{D.year} entry</span>
                        </div>
                        <ol className="flex flex-col">
                            <JourneyStep state="done" title="Profile complete" />
                            <JourneyStep state="done" title="Matched with Eleanor Whitfield" />
                            <JourneyStep state="current" title={`Next session: ${D.next.day}, ${D.next.time}`} hint={`${D.next.relative} · with ${D.next.mentor}`}>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <a className={buttonVariants({ size: 'sm' })}>View my sessions</a>
                                    <button className={buttonVariants({ size: 'sm', variant: 'secondary' })}><Plus weight="bold" />Book another</button>
                                </div>
                            </JourneyStep>
                            {D.milestones.map((m, i) => (
                                <JourneyStep key={m.label} state="upcoming" title={m.label} hint={`${m.date} · ${m.days} days`} last={i === D.milestones.length - 1} />
                            ))}
                        </ol>
                    </div>
                </Rise>
            </div>

            <div className="space-y-4 md:pt-[124px]">
                <Rise i={2}>
                    <div className="rounded-card bg-primary p-6 text-center text-primary-foreground shadow-overlay">
                        <ProgressRing value={D.hours} max={D.hours} size={96} stroke={8} label={`${D.hours} hours left`} tone="success" className="[&_circle:first-child]:stroke-white/15">
                            <span className="text-3xl font-semibold tracking-tight">{D.hours}</span>
                        </ProgressRing>
                        <p className="mt-3 font-medium">hours left</p>
                        <p className="text-sm text-primary-foreground/70">{D.thisWeek} booked this week</p>
                        <button className={cn(amberButton, 'mt-5 w-full')}>Book a session</button>
                    </div>
                </Rise>
                <Rise i={3}>
                    <div className={cn(card, 'p-5')}>
                        <p className="mb-4 text-sm font-semibold text-foreground">This week</p>
                        <WeekStrip compact />
                    </div>
                </Rise>
            </div>
        </div>
    )
}

function JourneyStep({ state, title, hint, last, children }: { state: 'done' | 'current' | 'upcoming'; title: string; hint?: string; last?: boolean; children?: ReactNode }) {
    return (
        <li className={cn('relative flex gap-4', !last && 'pb-6')} aria-current={state === 'current' ? 'step' : undefined}>
            {!last && (
                <span aria-hidden className={cn('absolute top-9 bottom-1 left-[17px] border-s-2', state === 'done' ? 'border-solid border-success/40' : 'border-dashed border-input')} />
            )}
            {state === 'done' ? (
                <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-success text-white"><Check weight="bold" className="size-4" /></span>
            ) : state === 'current' ? (
                <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-card ring-2 ring-inset ring-brand"><span className="size-3 rounded-full bg-brand" /></span>
            ) : (
                <span className="relative z-10 size-9 shrink-0 rounded-full border-2 border-dashed border-input bg-card" />
            )}
            <div className={cn('min-w-0 pt-1.5', state === 'current' && 'flex-1 rounded-card bg-tint-blue/60 -mt-1 p-4 pt-2.5')}>
                <p className={cn('text-base', state === 'current' ? 'font-semibold text-foreground' : state === 'done' ? 'text-foreground' : 'text-muted-foreground')}>{title}</p>
                {hint && <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{hint}</p>}
                {children}
            </div>
        </li>
    )
}
