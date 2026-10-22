'use client'

import { useState, type ReactNode } from 'react'
import {
    ArrowRight,
    CalendarBlank,
    ChartBar,
    Check,
    Clock,
    Eye,
    FileText,
    GraduationCap,
    Hourglass,
    Medal,
    Play,
    VideoCamera,
} from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ApplicationTimeline from '@/components/dashboard/application-timeline'

/*
 * Sample data. Every field is one the portal already stores for a student
 * (sessions, session_reports, student_profiles, student_mentor_assignments,
 * student_session_targets, student_session_milestones, credit balance).
 * Nothing here needs a new column.
 */
const D = {
    parent: 'Sarah',
    timezone: 'London',
    child: {
        name: 'Amelia Hughes',
        first: 'Amelia',
        school: "St Mary's School",
        year: 'Year 12',
        university: 'Cambridge',
        course: 'History',
        entryYear: 2027,
        examDate: '2026-11-01',
    },
    mentor: {
        name: 'Oliver Bennett',
        college: 'Balliol College, Oxford',
        subject: 'History',
        bio: 'Final-year historian who has helped students through the HAT and interview preparation for three admissions rounds.',
    },
    next: { day: 'Thursday 23 October', time: '16:00 – 17:00', inDays: 1 },
    stats: { completed: 14, hoursUsed: 14, hoursTotal: 20, targetPerWeek: 2 },
    // Sessions per week, oldest first (last 10 weeks).
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
    upcoming: [
        { day: 'Thu 23 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett' },
        { day: 'Mon 27 Oct', time: '17:30 – 18:30', mentor: 'Oliver Bennett' },
    ],
    past: [
        { day: 'Mon 20 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett', report: true, recording: true },
        { day: 'Tue 14 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett', report: true, recording: true },
        { day: 'Thu 9 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett', report: true, recording: false },
        { day: 'Mon 6 Oct', time: '16:00 – 17:00', mentor: 'Oliver Bennett', report: true, recording: true },
    ],
    reports: [
        {
            day: 'Monday 20 October',
            mentor: 'Oliver Bennett',
            summary:
                'Amelia worked through a past HAT source passage on the Peasants’ Revolt. Her reading was careful and she picked out the author’s bias quickly; the next step is turning those observations into a tighter written argument under time pressure.',
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
    ],
    recordings: [
        { day: 'Monday 20 October', mentor: 'Oliver Bennett', minutes: 58 },
        { day: 'Tuesday 14 October', mentor: 'Oliver Bennett', minutes: 61 },
        { day: 'Monday 6 October', mentor: 'Oliver Bennett', minutes: 55 },
    ],
    milestones: [
        { n: 1, reached: true },
        { n: 5, reached: true },
        { n: 10, reached: true },
        { n: 20, reached: false },
    ],
}

/**
 * First-load entrance, identical to the student home's Rise (better-ui):
 * 100ms apart, 12px rise with 4px blur over 300ms ease-out; fade only under
 * reduced motion. Tab switches do not animate (high-frequency interaction).
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
    return (
        <div className="mx-auto max-w-3xl pb-16">
            <Rise i={0}>
                <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
                        {D.child.first}&rsquo;s progress
                        <Badge tone="outline">
                            <Eye weight="bold" />
                            View only
                        </Badge>
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                        Good afternoon, {D.parent}
                    </h1>
                </div>
            </Rise>

            <Rise i={1} className="mt-5">
                <ChildStrip />
            </Rise>

            <Tabs defaultValue="progress" className="mt-8">
                {/* Four equal segments on phones, so no tab hides off-screen. */}
                <TabsList className="grid w-full grid-cols-4 sm:inline-flex sm:w-fit">
                    <TabsTrigger value="progress" className="px-1 sm:px-4">Progress</TabsTrigger>
                    <TabsTrigger value="sessions" className="px-1 sm:px-4">Sessions</TabsTrigger>
                    <TabsTrigger value="reports" className="px-1 sm:px-4">Reports</TabsTrigger>
                    <TabsTrigger value="recordings" className="px-1 sm:px-4">Recordings</TabsTrigger>
                </TabsList>

                <TabsContent value="progress" className="mt-6 space-y-6">
                    <ProgressTab />
                </TabsContent>
                <TabsContent value="sessions" className="mt-6 space-y-8">
                    <SessionsTab />
                </TabsContent>
                <TabsContent value="reports" className="mt-6 space-y-4">
                    {D.reports.map((r) => (
                        <ReportCard key={r.day} report={r} />
                    ))}
                </TabsContent>
                <TabsContent value="recordings" className="mt-6">
                    <RecordingsTab />
                </TabsContent>
            </Tabs>

            <p className="mt-10 text-center text-sm text-muted-foreground">
                Times are shown in your time zone ({D.timezone}). You can view {D.child.first}&rsquo;s progress here;
                sessions and messages stay between {D.child.first} and her mentor.
            </p>
        </div>
    )
}

function ChildStrip() {
    return (
        <Card>
            <CardContent className="flex flex-wrap items-center gap-4">
                <Avatar name={D.child.name} size="lg" />
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">{D.child.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {D.child.year} · {D.child.school}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">
                        <GraduationCap weight="bold" />
                        {D.child.university} · {D.child.course}
                    </Badge>
                    <Badge tone="neutral">{D.child.entryYear} entry</Badge>
                </div>
            </CardContent>
        </Card>
    )
}

function ProgressTab() {
    const { completed, hoursUsed, hoursTotal, targetPerWeek } = D.stats
    const hoursLeft = hoursTotal - hoursUsed
    const recent = D.weeks.slice(-4)
    const avg = recent.reduce((s, w) => s + w.n, 0) / recent.length
    const onTrack = avg >= targetPerWeek * 0.75

    return (
        <>
            <Rise i={2}>
                <NextSession />
            </Rise>

            <Rise i={3} className="grid gap-4 sm:grid-cols-3">
                <Stat icon={<Check weight="bold" />} label="Sessions completed" value={String(completed)} hint="since 4 August" />
                <Card>
                    <CardContent className="flex items-center gap-4">
                        <ProgressRing value={hoursLeft} max={hoursTotal} size={52} stroke={6} label="Hours left" tone={hoursLeft <= 3 ? 'warning' : 'brand'}>
                            <span className="text-sm font-semibold tabular-nums">{hoursLeft}</span>
                        </ProgressRing>
                        <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">Hours left</p>
                            <p className="font-semibold tabular-nums">
                                {hoursLeft} of {hoursTotal}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Stat
                    icon={<ChartBar weight="bold" />}
                    label="Pace"
                    value={onTrack ? 'On track' : 'Behind plan'}
                    hint={`Plan: ${targetPerWeek} sessions a week`}
                    tone={onTrack ? 'success' : 'warning'}
                />
            </Rise>

            <Rise i={4}>
                <ActivityChart avg={avg} />
            </Rise>

            <Rise i={5}>
                <section>
                    <SectionHeading title="Latest session report" action="All reports" />
                    <ReportCard report={D.reports[0]} />
                </section>
            </Rise>

            <Rise i={6} className="grid gap-4 sm:grid-cols-2">
                <MentorCard />
                <Milestones />
            </Rise>

            <Rise i={7}>
                <ApplicationTimeline applicationYear={D.child.entryYear} entranceExamDate={D.child.examDate} targetUniversity={D.child.university} />
            </Rise>

            <Rise i={8}>
                <RequestHours hoursLeft={hoursLeft} />
            </Rise>
        </>
    )
}

function NextSession() {
    return (
        <Card>
            <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar name={D.mentor.name} size="lg" />
                        <div>
                            <p className="text-sm font-medium text-brand">Next session · {D.next.inDays === 1 ? 'Tomorrow' : `In ${D.next.inDays} days`}</p>
                            <p className="mt-0.5 text-lg font-semibold">
                                {D.next.day} · <span className="tabular-nums">{D.next.time}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {D.mentor.subject} with {D.mentor.name}
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

function Stat({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: string; hint: string; tone?: 'success' | 'warning' }) {
    return (
        <Card>
            <CardContent>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground [&_svg]:size-4">
                    {icon}
                    {label}
                </p>
                <p className={cn('mt-1 text-xl font-semibold tabular-nums', tone === 'success' && 'text-success', tone === 'warning' && 'text-warning')}>{value}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
            </CardContent>
        </Card>
    )
}

/**
 * Sessions per week against the plan. Functional data, so it does not
 * animate. The bar heights carry the value; the table below gives the same
 * numbers to screen readers.
 */
function ActivityChart({ avg }: { avg: number }) {
    const max = Math.max(3, ...D.weeks.map((w) => w.n))
    const target = D.stats.targetPerWeek
    return (
        <Card className="bg-tint-blue">
            <CardHeader>
                <div>
                    <CardTitle>Sessions per week</CardTitle>
                    <CardDescription>Last 10 weeks, against the plan of {target} a week</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-semibold tabular-nums text-tint-blue-foreground">{avg.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">avg, last 4 weeks</p>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative h-40" aria-hidden>
                    <div
                        className="absolute inset-x-0 border-t border-dashed border-tint-blue-foreground/40"
                        style={{ bottom: `${(target / max) * 100}%` }}
                    >
                        <span className="absolute -top-5 right-0 text-xs text-tint-blue-foreground/70">Plan</span>
                    </div>
                    <div className="flex h-full items-end gap-2">
                        {D.weeks.map((w) => (
                            <div key={w.label} className="flex h-full flex-1 flex-col justify-end">
                                <div
                                    className={cn('w-full rounded-t-md', w.n >= target ? 'bg-brand' : 'bg-brand/45', w.n === 0 && 'h-1 bg-brand/15')}
                                    style={w.n ? { height: `${(w.n / max) * 100}%` } : undefined}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground" aria-hidden>
                    {D.weeks.map((w, i) => (
                        <span key={w.label} className={cn('flex-1 text-center', i % 2 === 1 && 'max-sm:invisible')}>
                            {w.label}
                        </span>
                    ))}
                </div>
                <table className="sr-only">
                    <caption>Sessions per week</caption>
                    <tbody>
                        {D.weeks.map((w) => (
                            <tr key={w.label}>
                                <th scope="row">Week of {w.label}</th>
                                <td>
                                    {w.n} {w.n === 1 ? 'session' : 'sessions'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}

function SectionHeading({ title, action }: { title: string; action?: string }) {
    return (
        <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            {action && (
                <Button variant="link" size="sm">
                    {action}
                    <ArrowRight />
                </Button>
            )}
        </div>
    )
}

function ReportCard({ report }: { report: (typeof D.reports)[number] }) {
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

function MentorCard() {
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Mentor</p>
                <div className="mt-2 flex items-center gap-3">
                    <Avatar name={D.mentor.name} />
                    <div>
                        <p className="font-semibold">{D.mentor.name}</p>
                        <p className="text-sm text-muted-foreground">{D.mentor.college}</p>
                    </div>
                </div>
                <p className="mt-3 text-sm text-pretty text-muted-foreground">{D.mentor.bio}</p>
            </CardContent>
        </Card>
    )
}

function Milestones() {
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Milestones</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                    {D.milestones.map((m) => (
                        <li key={m.n}>
                            <Badge tone={m.reached ? 'amber' : 'outline'} size="lg" className={cn(!m.reached && 'text-muted-foreground')}>
                                <Medal weight={m.reached ? 'fill' : 'regular'} />
                                {ordinal(m.n)} session
                            </Badge>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">6 sessions to the next milestone.</p>
            </CardContent>
        </Card>
    )
}

function RequestHours({ hoursLeft }: { hoursLeft: number }) {
    const [sent, setSent] = useState(false)
    return (
        <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Hourglass className="mt-0.5 size-5 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">Need more hours?</p>
                        <p className="text-sm text-muted-foreground text-pretty">
                            {D.child.first} has {hoursLeft} hours left. Ask the team and they will be in touch.
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

function SessionsTab() {
    return (
        <>
            <section>
                <SectionHeading title="Upcoming" />
                <Card>
                    <ul className="divide-y divide-border">
                        {D.upcoming.map((s) => (
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
                <SectionHeading title="Past sessions" />
                <Card>
                    <ul className="divide-y divide-border">
                        {D.past.map((s) => (
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

function RecordingsTab() {
    const [playing, setPlaying] = useState<string | null>(null)
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {D.recordings.map((r) => (
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
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}
