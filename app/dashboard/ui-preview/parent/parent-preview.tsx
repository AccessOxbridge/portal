'use client'

import { useState, type ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import {
    ArrowRight,
    CalendarBlank,
    Check,
    CheckCircle,
    Circle,
    Clock,
    EnvelopeSimple,
    Eye,
    FileText,
    GraduationCap,
    Headset,
    Hourglass,
    Medal,
    Play,
    Sparkle,
    Target,
    UserCircle,
    VideoCamera,
} from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ProgressRing } from '@/components/ui/progress'
import { segmentClass, segmentTrack } from '@/components/ui/segmented'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/*
 * Sample data for the eight homepage widgets in "Confirmed Dashboard
 * Widgets" (22 Oct). Every field comes from something the portal already
 * stores for a student (sessions, session_reports, student_profiles,
 * student_mentor_assignments, student_session_milestones, credit balance),
 * except the session topic, which needs the booking "topic" field (planned).
 */
const PLAN_PER_WEEK = 2

const SUCCESS_MANAGER = {
    name: 'Claire Marlowe',
    title: 'Senior Strategist',
    // The shared office inbox for now (Raj, 22 Oct).
    email: 'office@accessoxbridge.io',
}

const LIVE = {
    first: 'Amelia',
    mentor: {
        name: 'Oliver Bennett',
        college: 'Balliol College, Oxford',
        subject: 'History',
        bio: 'Final-year historian who has helped students through the HAT and interview preparation for three admissions rounds.',
    },
    next: { day: 'Thursday 23 October', time: '16:00 – 17:00', when: 'Tomorrow', topic: 'Timed HAT source extract' },
    // Sessions completed per week, oldest first (last 10 weeks).
    weeks: [
        { label: '18 Aug', n: 1 },
        { label: '25 Aug', n: 2 },
        { label: '1 Sep', n: 2 },
        { label: '8 Sep', n: 1 },
        { label: '15 Sep', n: 2 },
        { label: '22 Sep', n: 2 },
        { label: '29 Sep', n: 0 },
        { label: '6 Oct', n: 2 },
        { label: '13 Oct', n: 2 },
        { label: '20 Oct', n: 2 },
    ],
    attended: { term: 13, total: 16, booked: 17, termStart: '1 Sep', since: '18 Aug' },
    goal: { university: 'Cambridge', course: 'History', entryYear: 2027 },
    milestones: [1, 5, 10, 20],
    hoursTotal: 20,
    reports: [
        {
            day: 'Monday 20 October',
            mentor: 'Oliver Bennett',
            summary:
                'Amelia worked through a past HAT source passage on the Peasants’ Revolt. The reading was careful and the author’s bias came out quickly; the next step is turning those observations into a tighter written argument under time pressure.',
            keyPoints: [
                'Identified the source’s perspective within the first read',
                'Comparisons between sources are improving',
                'Timing: finished the extract in 52 of 60 minutes',
            ],
            nextSteps: ['Complete one timed HAT extract before Thursday', 'Read chapter 3 of the reading list on medieval England'],
        },
        {
            day: 'Tuesday 14 October',
            mentor: 'Oliver Bennett',
            summary:
                'Personal statement review. The opening now leads with Amelia’s own reading rather than a quotation, which makes it far more personal. The middle section still lists activities without reflection.',
            keyPoints: ['Stronger opening paragraph', 'Super-curricular reading is well chosen'],
            nextSteps: ['Rewrite paragraph three to reflect on the museum placement'],
        },
        {
            day: 'Thursday 9 October',
            mentor: 'Oliver Bennett',
            summary: 'Interview practice on a primary source Amelia had not seen before. Good instinct to question the date and author first.',
            keyPoints: ['Calm under follow-up questions'],
            nextSteps: ['Practise thinking aloud for the first minute'],
        },
    ],
    upcoming: [
        { day: 'Thu 23 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett' },
        { day: 'Mon 27 Oct', time: '17:30 – 18:30', mentor: 'Oliver Bennett' },
    ],
    past: [
        { day: 'Mon 20 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett', report: true, recording: true },
        { day: 'Tue 14 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett', report: true, recording: true },
        { day: 'Thu 9 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett', report: true, recording: false },
        { day: 'Mon 6 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett', report: false, recording: true },
    ],
    recordings: [
        { day: 'Monday 20 October', mentor: 'Oliver Bennett', minutes: 58 },
        { day: 'Tuesday 14 October', mentor: 'Oliver Bennett', minutes: 61 },
        { day: 'Monday 6 October', mentor: 'Oliver Bennett', minutes: 55 },
    ],
}

/**
 * The three states a parent can see:
 * live      linked, sessions under way;
 * starting  linked, profile done and mentor matched, nothing booked yet;
 * unlinked  account made (by sales or an admin) before the child is linked.
 */
type Scenario = 'live' | 'starting' | 'unlinked'

function viewFor(scenario: Scenario, nameGiven: boolean) {
    const live = scenario === 'live'
    const linked = scenario !== 'unlinked'
    return {
        first: linked || nameGiven ? LIVE.first : null,
        linked,
        checklist: { activated: linked, profile: linked, matched: linked, booked: live },
        next: live ? LIVE.next : null,
        weeks: live ? LIVE.weeks : null,
        attended: live ? LIVE.attended : null,
        reports: live ? LIVE.reports : [],
        mentor: linked ? LIVE.mentor : null,
        goal: linked ? LIVE.goal : null,
        completed: live ? LIVE.attended.total : 0,
        hoursLeft: live ? LIVE.hoursTotal - LIVE.attended.total : linked ? LIVE.hoursTotal : null,
        upcoming: live ? LIVE.upcoming : [],
        past: live ? LIVE.past : [],
        recordings: live ? LIVE.recordings : [],
    }
}

type View = ReturnType<typeof viewFor>
type Report = (typeof LIVE.reports)[number]

/** Copy for the child, by name when we have it. Never a pronoun. */
function wordsFor(first: string | null) {
    return {
        child: first ?? 'your child',
        Child: first ?? 'Your child',
        childs: first ? `${first}’s` : 'your child’s',
        Childs: first ? `${first}’s` : 'Your child’s',
    }
}

type Words = ReturnType<typeof wordsFor>

/**
 * First-load entrance, identical to the student home's Rise (better-ui):
 * 100ms apart, 12px rise with 4px blur over 300ms ease-out; fade only under
 * reduced motion. Tab switches do not animate; switching the mockup's
 * preview state replays the page load, as if opened in that state.
 */
function Rise({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
    return (
        <div
            className={cn('animate-in fade-in-0 slide-in-from-bottom-3 blur-in-4 duration-300 ease-snappy fill-mode-both motion-reduce:slide-in-from-bottom-0 motion-reduce:blur-in-0', className)}
            style={{ animationDelay: `${i * 100}ms` }}
        >
            {children}
        </div>
    )
}

export default function ParentPreview() {
    const [scenario, setScenario] = useState<Scenario>('live')
    const [nameGiven, setNameGiven] = useState(true)
    const [tab, setTab] = useState('overview')
    const v = viewFor(scenario, nameGiven)
    const w = wordsFor(v.first)

    return (
        <div className="mx-auto max-w-3xl pb-16">
            <PreviewSwitcher scenario={scenario} onScenario={setScenario} nameGiven={nameGiven} onNameGiven={setNameGiven} />

            <div key={`${scenario}-${nameGiven}`}>
                <Rise i={0}>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
                        {w.Childs} progress
                        <Badge tone="outline">
                            <Eye weight="bold" />
                            View only
                        </Badge>
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Good afternoon, Sarah</h1>
                </Rise>

                <Tabs value={tab} onValueChange={setTab} className="mt-8">
                    {/* Four equal segments on phones, so no tab hides off-screen. */}
                    <TabsList className="grid w-full grid-cols-4 sm:inline-flex sm:w-fit">
                        <TabsTrigger value="overview" className="px-1 sm:px-4">Overview</TabsTrigger>
                        <TabsTrigger value="sessions" className="px-1 sm:px-4">Sessions</TabsTrigger>
                        <TabsTrigger value="reports" className="px-1 sm:px-4">Reports</TabsTrigger>
                        <TabsTrigger value="recordings" className="px-1 sm:px-4">Recordings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6 space-y-6">
                        <Overview v={v} w={w} onAllReports={() => setTab('reports')} />
                    </TabsContent>
                    <TabsContent value="sessions" className="mt-6 space-y-8">
                        <SessionsTab v={v} w={w} />
                    </TabsContent>
                    <TabsContent value="reports" className="mt-6 space-y-4">
                        {v.reports.length ? v.reports.map((r) => <ReportCard key={r.day} report={r} />) : <ReportsEmpty w={w} />}
                    </TabsContent>
                    <TabsContent value="recordings" className="mt-6">
                        <RecordingsTab v={v} />
                    </TabsContent>
                </Tabs>

                <p className="mt-10 text-center text-sm text-muted-foreground text-pretty">
                    Times are shown in your time zone (London). You can follow {w.childs} progress here; messages stay between{' '}
                    {w.child} and the mentor.
                </p>
            </div>
        </div>
    )
}

/** Not part of the page: lets the mockup show each widget's empty state. */
function PreviewSwitcher({
    scenario,
    onScenario,
    nameGiven,
    onNameGiven,
}: {
    scenario: Scenario
    onScenario: (s: Scenario) => void
    nameGiven: boolean
    onNameGiven: (b: boolean) => void
}) {
    const states: { value: Scenario; label: string }[] = [
        { value: 'live', label: 'Live' },
        { value: 'starting', label: 'Just started' },
        { value: 'unlinked', label: 'Not linked yet' },
    ]
    return (
        <div className="mb-8 rounded-card border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Mockup only: preview a state</p>
            <div className="flex flex-wrap items-center gap-2">
                <div className={segmentTrack} role="group" aria-label="Account state">
                    {states.map((s) => (
                        <button key={s.value} type="button" aria-pressed={scenario === s.value} className={segmentClass(scenario === s.value)} onClick={() => onScenario(s.value)}>
                            {s.label}
                        </button>
                    ))}
                </div>
                {scenario === 'unlinked' && (
                    <div className={segmentTrack} role="group" aria-label="Child's name">
                        <button type="button" aria-pressed={nameGiven} className={segmentClass(nameGiven)} onClick={() => onNameGiven(true)}>
                            Name given
                        </button>
                        <button type="button" aria-pressed={!nameGiven} className={segmentClass(!nameGiven)} onClick={() => onNameGiven(false)}>
                            No name
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function Overview({ v, w, onAllReports }: { v: View; w: Words; onAllReports: () => void }) {
    const c = v.checklist
    const onboarded = c.activated && c.profile && c.matched && c.booked
    let i = 1
    return (
        <>
            {!v.linked && (
                <Rise i={i++}>
                    <SetupBanner w={w} />
                </Rise>
            )}
            {!onboarded && (
                <Rise i={i++}>
                    <Onboarding v={v} w={w} />
                </Rise>
            )}
            <Rise i={i++}>
                <NextSession v={v} w={w} />
            </Rise>
            <Rise i={i++}>
                <ProgressGraph v={v} w={w} />
            </Rise>
            <Rise i={i++}>
                <SessionsAttended v={v} />
            </Rise>
            <Rise i={i++}>
                <section>
                    <div className="mb-3 flex items-end justify-between">
                        <h2 className="text-lg font-semibold">Session reports</h2>
                        {v.reports.length > 2 && (
                            <Button variant="link" size="sm" onClick={onAllReports}>
                                All reports
                                <ArrowRight />
                            </Button>
                        )}
                    </div>
                    {v.reports.length ? (
                        <div className="space-y-4">
                            {v.reports.slice(0, 2).map((r) => (
                                <ReportCard key={r.day} report={r} />
                            ))}
                        </div>
                    ) : (
                        <ReportsEmpty w={w} />
                    )}
                </section>
            </Rise>
            <Rise i={i++} className="grid gap-4 sm:grid-cols-2">
                <MentorCard v={v} w={w} />
                <SuccessManagerCard w={w} />
            </Rise>
            <Rise i={i++}>
                <Goals v={v} w={w} />
            </Rise>
            {onboarded && (
                <Rise i={i++}>
                    <Onboarding v={v} w={w} />
                </Rise>
            )}
            {v.hoursLeft !== null && (
                <Rise i={i++}>
                    <RequestHours hoursLeft={v.hoursLeft} w={w} />
                </Rise>
            )}
        </>
    )
}

function SetupBanner({ w }: { w: Words }) {
    return (
        <Card className="bg-tint-blue">
            <CardContent className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-tint-blue-foreground">
                    <Sparkle weight="duotone" className="size-5" />
                </div>
                <div>
                    <p className="font-semibold text-balance">{w.Childs} portal is being set up</p>
                    <p className="mt-1 text-sm text-pretty text-muted-foreground">
                        Once your account is linked to {w.childs} account, sessions, reports and progress appear here. There is nothing
                        you need to do yet.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

/** A compact empty state for cards that sit in the page's flow. */
function EmptyRow({ icon: IconComponent, title, description }: { icon: Icon; title: string; description: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <IconComponent weight="duotone" className="size-6" />
            </div>
            <div className="min-w-0">
                <p className="font-semibold text-balance">{title}</p>
                <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{description}</p>
            </div>
        </div>
    )
}

function Onboarding({ v, w }: { v: View; w: Words }) {
    const c = v.checklist
    const items = [
        { label: 'Account activated', hint: `${w.Child} signs in to the portal`, done: c.activated },
        { label: 'Academic profile completed', hint: 'School, subjects and target course', done: c.profile },
        { label: 'Mentor matched', hint: 'Paired with an Oxford or Cambridge mentor', done: c.matched },
        { label: 'First session booked', hint: 'With the matched mentor', done: c.booked },
    ]
    const done = items.filter((x) => x.done).length
    const complete = done === items.length
    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>{complete ? 'Onboarding complete' : 'Getting started'}</CardTitle>
                    <CardDescription>
                        {done} of {items.length} steps done
                    </CardDescription>
                </div>
                <ProgressRing value={done} max={items.length} size={44} stroke={5} label="Onboarding steps done" tone={complete ? 'success' : 'brand'}>
                    <span className="text-xs font-semibold tabular-nums">{done}</span>
                </ProgressRing>
            </CardHeader>
            <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                    {items.map((x) => (
                        <li key={x.label} className="flex gap-3">
                            {x.done ? (
                                <CheckCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-success" aria-label="Done" />
                            ) : (
                                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/60" aria-label="Not yet" />
                            )}
                            <div className="min-w-0">
                                <p className={cn('text-sm font-medium', !x.done && 'text-muted-foreground')}>{x.label}</p>
                                <p className="text-xs text-muted-foreground">{x.hint}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}

function NextSession({ v, w }: { v: View; w: Words }) {
    if (!v.next || !v.mentor) {
        return (
            <Card>
                <CardContent>
                    <EmptyRow
                        icon={CalendarBlank}
                        title={`${w.Childs} first session will appear here`}
                        description="Once it is booked you will see the date, time, mentor and topic."
                    />
                </CardContent>
            </Card>
        )
    }
    return (
        <Card>
            <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <Avatar name={v.mentor.name} size="lg" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-brand">Next session · {v.next.when}</p>
                            <p className="mt-0.5 text-lg font-semibold">
                                {v.next.day} · <span className="tabular-nums">{v.next.time}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {v.next.topic} · with {v.mentor.name}
                            </p>
                        </div>
                    </div>
                    <Badge tone="green">
                        <CalendarBlank weight="bold" />
                        Booked
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}

/** Points for a line in a 100×100 box, oldest on the left. */
function points(values: number[], max: number) {
    return values.map((n, i) => [(i / (values.length - 1)) * 100, 100 - (n / max) * 100] as const)
}

function pathOf(p: readonly (readonly [number, number])[]) {
    return p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
}

/**
 * Sessions completed over time, against the plan. Functional data, so it
 * does not animate; the table gives screen readers the same numbers. Before
 * the first session it shows a faded, labelled sample line instead.
 */
function ProgressGraph({ v, w }: { v: View; w: Words }) {
    if (!v.weeks) return <ProgressGraphEmpty w={w} />

    const weeks = v.weeks
    const totals = weeks.map((_, i) => weeks.slice(0, i + 1).reduce((s, x) => s + x.n, 0))
    const plan = weeks.map((_, i) => (i + 1) * PLAN_PER_WEEK)
    const max = Math.max(totals[totals.length - 1], plan[plan.length - 1]) * 1.08
    const line = points(totals, max)
    const [endX, endY] = line[line.length - 1]

    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Progress</CardTitle>
                    <CardDescription>Sessions completed since {weeks[0].label}, against a plan of {PLAN_PER_WEEK} a week</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-semibold tabular-nums">{totals[totals.length - 1]}</p>
                    <p className="text-xs text-muted-foreground">sessions</p>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative h-40" aria-hidden>
                    <ChartGrid />
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                        <path d={`${pathOf(line)} L100 100 L0 100 Z`} className="fill-brand/10" />
                        <path d={pathOf(points(plan, max))} fill="none" className="stroke-muted-foreground/60" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                        <path d={pathOf(line)} fill="none" className="stroke-brand" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <span
                        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-4 ring-card"
                        style={{ left: `${endX}%`, top: `${endY}%` }}
                    />
                </div>
                <WeekLabels labels={weeks.map((x) => x.label)} />
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
                    <span className="flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded-full bg-brand" />
                        {w.Child}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-4 border-t-[1.5px] border-dashed border-muted-foreground/60" />
                        Plan
                    </span>
                </div>
                <table className="sr-only">
                    <caption>Sessions completed, by week</caption>
                    <tbody>
                        {weeks.map((x, i) => (
                            <tr key={x.label}>
                                <th scope="row">Week of {x.label}</th>
                                <td>
                                    {totals[i]} completed, plan {plan[i]}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}

function ProgressGraphEmpty({ w }: { w: Words }) {
    const sample = [0, 1, 3, 4, 6, 7, 9, 11]
    const line = points(sample, 13)
    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Progress</CardTitle>
                    <CardDescription>Sessions completed over time</CardDescription>
                </div>
                <Badge tone="outline">Sample</Badge>
            </CardHeader>
            <CardContent>
                <div className="relative h-40">
                    <div className="absolute inset-0" aria-hidden>
                        <ChartGrid />
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                            <path d={pathOf(line)} fill="none" className="stroke-muted-foreground/30" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </svg>
                    </div>
                    <div className="absolute inset-0 grid place-items-center px-4">
                        <div className="rounded-control bg-card/90 px-4 py-3 text-center shadow-border backdrop-blur-sm">
                            <p className="font-semibold text-balance">Progress tracking starts after onboarding</p>
                            <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                                The faded line is a sample. {w.Childs} real progress replaces it.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ChartGrid() {
    return (
        <>
            {[0, 50, 100].map((top) => (
                <div key={top} className="absolute inset-x-0 border-t border-border/70" style={{ top: `${top}%` }} />
            ))}
        </>
    )
}

function WeekLabels({ labels }: { labels: string[] }) {
    // Every other label on phones, counted back from the latest week so it
    // always shows; the end labels line up with the ends of the line.
    return (
        <div className="relative mt-2 h-4 text-[11px] text-muted-foreground" aria-hidden>
            {labels.map((label, i) => (
                <span
                    key={label}
                    className={cn('absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full', (labels.length - 1 - i) % 2 === 1 && 'max-sm:hidden')}
                    style={{ left: `${(i / (labels.length - 1)) * 100}%` }}
                >
                    {label}
                </span>
            ))}
        </div>
    )
}

function SessionsAttended({ v }: { v: View }) {
    const a = v.attended
    const cells = [
        { label: 'This term', value: a ? String(a.term) : '0', hint: a ? `since ${a.termStart}` : 'sessions' },
        { label: 'Total', value: a ? String(a.total) : '0', hint: a ? `since ${a.since}` : 'sessions' },
        {
            label: 'Attendance',
            value: a ? `${Math.round((a.total / a.booked) * 100)}%` : '–',
            hint: a ? `${a.total} of ${a.booked} booked` : 'after the first session',
        },
    ]
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Sessions attended</p>
                <dl className="mt-3 grid grid-cols-3 divide-x divide-border">
                    {cells.map((c) => (
                        <div key={c.label} className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-5">
                            <dt className="text-xs text-muted-foreground">{c.label}</dt>
                            <dd className={cn('mt-0.5 text-2xl font-semibold tabular-nums', !a && 'text-muted-foreground')}>{c.value}</dd>
                            <dd className="text-xs text-pretty text-muted-foreground">{c.hint}</dd>
                        </div>
                    ))}
                </dl>
            </CardContent>
        </Card>
    )
}

function ReportsEmpty({ w }: { w: Words }) {
    return (
        <Card>
            <EmptyState
                icon={FileText}
                title="Reports appear after each session"
                description={`${w.Childs} mentor writes a short report after every session. The newest is shown first.`}
            />
        </Card>
    )
}

function ReportCard({ report }: { report: Report }) {
    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>{report.day}</CardTitle>
                    <CardDescription>Session with {report.mentor}</CardDescription>
                </div>
                <FileText className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="max-w-prose text-pretty leading-relaxed">{report.summary}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ReportList title="What went well" items={report.keyPoints} />
                    <ReportList title="Next steps" items={report.nextSteps} />
                </div>
            </CardContent>
        </Card>
    )
}

function ReportList({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <ul className="mt-1.5 space-y-1.5">
                {items.map((t) => (
                    <li key={t} className="flex gap-2 text-sm text-pretty">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                        {t}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function MentorCard({ v, w }: { v: View; w: Words }) {
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Mentor</p>
                {v.mentor ? (
                    <>
                        <div className="mt-3 flex items-center gap-3">
                            <Avatar name={v.mentor.name} size="lg" />
                            <div className="min-w-0">
                                <p className="font-semibold">{v.mentor.name}</p>
                                <p className="text-sm text-muted-foreground">{v.mentor.college}</p>
                            </div>
                        </div>
                        <Badge tone="blue" className="mt-3">
                            <GraduationCap weight="bold" />
                            {v.mentor.subject}
                        </Badge>
                        <p className="mt-3 text-sm text-pretty text-muted-foreground">{v.mentor.bio}</p>
                    </>
                ) : (
                    <div className="mt-3">
                        <EmptyRow
                            icon={UserCircle}
                            title="A mentor is being matched"
                            description={`${w.Childs} Oxford or Cambridge mentor will appear here, with their subject and background.`}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/** Claire for every family for now: name, title and work email; no photo. */
function SuccessManagerCard({ w }: { w: Words }) {
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Success manager</p>
                <div className="mt-3 flex items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-tint-violet text-tint-violet-foreground">
                        <Headset weight="duotone" className="size-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold">{SUCCESS_MANAGER.name}</p>
                        <p className="text-sm text-muted-foreground">{SUCCESS_MANAGER.title}</p>
                    </div>
                </div>
                <p className="mt-3 text-sm text-pretty text-muted-foreground">Your contact for anything about {w.childs} programme.</p>
                <a
                    href={`mailto:${SUCCESS_MANAGER.email}`}
                    className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-sm text-sm font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                    <EnvelopeSimple weight="bold" className="size-4 shrink-0" />
                    <span className="truncate">{SUCCESS_MANAGER.email}</span>
                </a>
            </CardContent>
        </Card>
    )
}

function Goals({ v, w }: { v: View; w: Words }) {
    if (!v.goal) {
        return (
            <Card>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Goals and milestones</p>
                    <div className="mt-3">
                        <EmptyRow
                            icon={Target}
                            title={`Goals are set with ${w.childs} mentor`}
                            description="The target university and course, and the milestones along the way, appear here once agreed."
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }
    const next = LIVE.milestones.find((n) => n > v.completed)
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Goals and milestones</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                        <Target weight="duotone" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                            {v.goal.university} · {v.goal.course}
                        </p>
                        <p className="text-sm text-muted-foreground">{v.goal.entryYear} entry</p>
                    </div>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2">
                    {LIVE.milestones.map((n) => {
                        const reached = v.completed >= n
                        return (
                            <li key={n}>
                                <Badge tone={reached ? 'amber' : 'outline'} size="lg" className={cn(!reached && 'text-muted-foreground')}>
                                    <Medal weight={reached ? 'fill' : 'regular'} />
                                    {ordinal(n)} session
                                </Badge>
                            </li>
                        )
                    })}
                </ul>
                {next && (
                    <p className="mt-3 text-sm text-muted-foreground">
                        {next - v.completed} {next - v.completed === 1 ? 'session' : 'sessions'} to the next milestone.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

function RequestHours({ hoursLeft, w }: { hoursLeft: number; w: Words }) {
    const [sent, setSent] = useState(false)
    return (
        <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Hourglass className="mt-0.5 size-5 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">Need more hours?</p>
                        <p className="text-sm text-muted-foreground text-pretty">
                            {w.Child} has {hoursLeft} {hoursLeft === 1 ? 'hour' : 'hours'} left. Ask the team and they will be in touch.
                        </p>
                    </div>
                </div>
                {sent ? (
                    <Badge tone="green" size="lg">
                        <Check weight="bold" />
                        Request sent
                    </Badge>
                ) : (
                    <Button variant="secondary" onClick={() => setSent(true)}>
                        Request more hours
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

function SessionsTab({ v, w }: { v: View; w: Words }) {
    if (!v.upcoming.length && !v.past.length) {
        return (
            <Card>
                <EmptyState icon={CalendarBlank} title={`${w.Childs} first session will appear here`} description="Upcoming and past sessions are listed here once booked." />
            </Card>
        )
    }
    return (
        <>
            <section>
                <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
                <Card>
                    <ul className="divide-y divide-border">
                        {v.upcoming.map((s) => (
                            <li key={s.day} className="flex items-center gap-4 px-5 py-4">
                                <CalendarBlank className="size-5 text-brand" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">
                                        {s.day} · <span className="tabular-nums">{s.time}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">with {s.mentor}</p>
                                </div>
                                <Badge tone="green">Booked</Badge>
                            </li>
                        ))}
                    </ul>
                </Card>
            </section>
            <section>
                <h2 className="mb-3 text-lg font-semibold">Past sessions</h2>
                <Card>
                    <ul className="divide-y divide-border">
                        {v.past.map((s) => (
                            <li key={s.day} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                                <Clock className="size-5 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">
                                        {s.day} · <span className="tabular-nums">{s.time}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">with {s.mentor}</p>
                                </div>
                                <div className="flex gap-2">
                                    {s.report && (
                                        <Badge tone="blue">
                                            <FileText weight="bold" />
                                            Report
                                        </Badge>
                                    )}
                                    {s.recording && (
                                        <Badge tone="violet">
                                            <VideoCamera weight="bold" />
                                            Recording
                                        </Badge>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </section>
        </>
    )
}

function RecordingsTab({ v }: { v: View }) {
    const [playing, setPlaying] = useState<string | null>(null)
    if (!v.recordings.length) {
        return (
            <Card>
                <EmptyState icon={VideoCamera} title="Recordings appear after each session" description="Every session is recorded, so you can watch it back here." />
            </Card>
        )
    }
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {v.recordings.map((r) => (
                <Card key={r.day}>
                    <CardContent>
                        <div className="grid aspect-video place-items-center rounded-control bg-primary/90 text-primary-foreground">
                            {playing === r.day ? (
                                <p className="text-sm">Player would load here</p>
                            ) : (
                                <Button variant="secondary" size="icon" aria-label={`Play recording from ${r.day}`} onClick={() => setPlaying(r.day)}>
                                    <Play weight="fill" className="translate-x-px" />
                                </Button>
                            )}
                        </div>
                        <p className="mt-3 font-medium">{r.day}</p>
                        <p className="text-sm text-muted-foreground">
                            with {r.mentor} · <span className="tabular-nums">{r.minutes} min</span>
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function ordinal(n: number) {
    const s = ['th', 'st', 'nd', 'rd']
    const d = n % 100
    return n + (s[(d - 20) % 10] || s[d] || s[0])
}
