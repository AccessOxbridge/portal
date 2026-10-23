'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Icon } from '@phosphor-icons/react'
import {
    ArrowRight,
    CalendarBlank,
    Check,
    CheckCircle,
    Circle,
    EnvelopeSimple,
    Eye,
    FileText,
    GraduationCap,
    Headset,
    Hourglass,
    Medal,
    Sparkle,
    Target,
    UserCircle,
} from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { ProgressRing } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { normalizeReportMarkdown, sanitizeReportContent } from '@/lib/report-utils'
import type { ParentHomeData, ParentReport } from '@/lib/parent-dashboard'
import { SUCCESS_MANAGER, wordsFor, type ParentWords } from '@/lib/parent-words'

type Words = ParentWords

/**
 * First-load entrance, identical to the student home's Rise (better-ui):
 * 100ms apart, 12px rise with 4px blur over 300ms ease-out; fade only under
 * reduced motion.
 */
export function Rise({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
    return (
        <div
            className={cn('animate-in fade-in-0 slide-in-from-bottom-3 blur-in-4 duration-300 ease-snappy fill-mode-both motion-reduce:slide-in-from-bottom-0 motion-reduce:blur-in-0', className)}
            style={{ animationDelay: `${i * 100}ms` }}
        >
            {children}
        </div>
    )
}

/** Page heading shared by every parent page: "<Child>'s progress · View only". */
export function ParentHeading({ childFirstName, title }: { childFirstName: string | null; title: string }) {
    const w = wordsFor(childFirstName)
    return (
        <Rise i={0}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
                {w.Childs} progress
                <Badge tone="outline">
                    <Eye weight="bold" />
                    View only
                </Badge>
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        </Rise>
    )
}

/** The eight widgets from "Confirmed Dashboard Widgets", each with a live and an empty state. */
export function ParentHome({ data, onRequestHours }: { data: ParentHomeData; onRequestHours?: () => Promise<boolean> }) {
    const w = wordsFor(data.childFirstName)
    const c = data.checklist
    const onboarded = c.activated && c.profile && c.matched && c.booked
    let i = 1
    return (
        <div className="mx-auto max-w-3xl pb-16">
            <ParentHeading childFirstName={data.childFirstName} title={`${data.greeting}, ${data.parentFirstName}`} />

            <div className="mt-8 space-y-6">
                {!data.linked && (
                    <Rise i={i++}>
                        <SetupBanner w={w} />
                    </Rise>
                )}
                {!onboarded && (
                    <Rise i={i++}>
                        <Onboarding data={data} w={w} />
                    </Rise>
                )}
                <Rise i={i++}>
                    <NextSession data={data} w={w} />
                </Rise>
                <Rise i={i++}>
                    <ProgressGraph data={data} w={w} />
                </Rise>
                <Rise i={i++}>
                    <SessionsAttended data={data} />
                </Rise>
                <Rise i={i++}>
                    <section>
                        <div className="mb-3 flex items-end justify-between">
                            <h2 className="text-lg font-semibold">Session reports</h2>
                            {data.reportsTotal > data.reports.length && (
                                <Button asChild variant="link" size="sm">
                                    <Link href="/dashboard/parent/reports">
                                        All reports
                                        <ArrowRight />
                                    </Link>
                                </Button>
                            )}
                        </div>
                        {data.reports.length ? (
                            <div className="space-y-4">
                                {data.reports.map((r) => (
                                    <ParentReportCard key={r.id} report={r} />
                                ))}
                            </div>
                        ) : (
                            <ReportsEmpty childFirstName={data.childFirstName} />
                        )}
                    </section>
                </Rise>
                <Rise i={i++} className="grid gap-4 sm:grid-cols-2">
                    <MentorCard data={data} w={w} />
                    <SuccessManagerCard w={w} />
                </Rise>
                <Rise i={i++}>
                    <Goals data={data} w={w} />
                </Rise>
                {onboarded && (
                    <Rise i={i++}>
                        <Onboarding data={data} w={w} />
                    </Rise>
                )}
                {data.hoursLeft !== null && (
                    <Rise i={i++}>
                        <RequestHours hoursLeft={data.hoursLeft} w={w} onRequest={onRequestHours} />
                    </Rise>
                )}
            </div>

            <ParentFootnote childFirstName={data.childFirstName} timezoneLabel={data.timezoneLabel} />
        </div>
    )
}

export function ParentFootnote({ childFirstName, timezoneLabel }: { childFirstName: string | null; timezoneLabel: string }) {
    const w = wordsFor(childFirstName)
    return (
        <p className="mt-10 text-center text-sm text-muted-foreground text-pretty">
            Times are shown in {w.childs} time zone ({timezoneLabel}). You can follow {w.childs} progress here; messages stay
            between {w.child} and the mentor.
        </p>
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

function Onboarding({ data, w }: { data: ParentHomeData; w: Words }) {
    const c = data.checklist
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

function NextSession({ data, w }: { data: ParentHomeData; w: Words }) {
    const next = data.next
    if (!next) {
        return (
            <Card>
                <CardContent>
                    <EmptyRow
                        icon={CalendarBlank}
                        title={data.checklist.booked ? 'No upcoming session booked' : `${w.Childs} first session will appear here`}
                        description="Once a session is booked you will see the date, time and mentor here."
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
                        <Avatar name={next.mentorName} src={next.mentorPhotoUrl} size="lg" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-brand">Next session · {next.when}</p>
                            <p className="mt-0.5 text-lg font-semibold">
                                {next.dateLabel} · <span className="tabular-nums">{next.timeLabel}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {next.topic ? `${next.topic} · ` : ''}with {next.mentorName}
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
 * Total sessions completed over time, against the plan when there is one.
 * Functional data, so it does not animate; the table gives screen readers the
 * same numbers. Before the first session it shows a faded, labelled sample.
 */
function ProgressGraph({ data, w }: { data: ParentHomeData; w: Words }) {
    const progress = data.progress
    if (!progress) return <ProgressGraphEmpty w={w} />

    const pts = progress.points
    const totals = pts.map((p) => p.completed)
    const plan = pts.every((p) => p.plan !== null) ? pts.map((p) => p.plan as number) : null
    const max = Math.max(1, ...totals, ...(plan ?? [])) * 1.08
    const line = points(totals, max)
    const [endX, endY] = line[line.length - 1]

    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Progress</CardTitle>
                    <CardDescription>
                        Sessions completed{plan && progress.planLabel ? `, against a plan of ${progress.planLabel}` : ''}
                    </CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-semibold tabular-nums">{progress.total}</p>
                    <p className="text-xs text-muted-foreground">{progress.total === 1 ? 'session' : 'sessions'}</p>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative h-40" aria-hidden>
                    <ChartGrid />
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                        <path d={`${pathOf(line)} L100 100 L0 100 Z`} className="fill-brand/10" />
                        {plan && (
                            <path d={pathOf(points(plan, max))} fill="none" className="stroke-muted-foreground/60" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                        )}
                        <path d={pathOf(line)} fill="none" className="stroke-brand" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <span
                        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-4 ring-card"
                        style={{ left: `${endX}%`, top: `${endY}%` }}
                    />
                </div>
                <WeekLabels labels={pts.map((p) => p.label)} />
                {plan && (
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
                )}
                <table className="sr-only">
                    <caption>Sessions completed, by week</caption>
                    <tbody>
                        {pts.map((p) => (
                            <tr key={p.label}>
                                <th scope="row">{p.label}</th>
                                <td>
                                    {p.completed} completed{p.plan !== null ? `, plan ${Math.floor(p.plan)}` : ''}
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
    const line = points([0, 1, 3, 4, 6, 7, 9, 11], 13)
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
                            <p className="mt-0.5 text-sm text-pretty text-muted-foreground">The faded line is a sample. {w.Childs} real progress replaces it.</p>
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
                    key={`${i}:${label}`}
                    className={cn('absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full', (labels.length - 1 - i) % 2 === 1 && 'max-sm:hidden')}
                    style={{ left: `${(i / Math.max(1, labels.length - 1)) * 100}%` }}
                >
                    {label}
                </span>
            ))}
        </div>
    )
}

function SessionsAttended({ data }: { data: ParentHomeData }) {
    const a = data.attended
    const none = a.total === 0 && a.upcoming === 0
    const cells = [
        { label: 'Total', value: a.total, hint: 'completed' },
        { label: 'Last 4 weeks', value: a.recent, hint: 'completed' },
        { label: 'Upcoming', value: a.upcoming, hint: 'booked' },
    ]
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Sessions attended</p>
                <dl className="mt-3 grid grid-cols-3 divide-x divide-border">
                    {cells.map((c) => (
                        <div key={c.label} className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-5">
                            <dt className="text-xs text-muted-foreground">{c.label}</dt>
                            <dd className={cn('mt-0.5 text-2xl font-semibold tabular-nums', none && 'text-muted-foreground')}>{c.value}</dd>
                            <dd className="text-xs text-muted-foreground">{c.hint}</dd>
                        </div>
                    ))}
                </dl>
            </CardContent>
        </Card>
    )
}

export function ReportsEmpty({ childFirstName }: { childFirstName: string | null }) {
    const w = wordsFor(childFirstName)
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

/**
 * One session report. Older reports have a summary with key points and next
 * steps; newer ones a written report. Shows whichever exists, and the
 * written report behind a toggle when both do.
 */
export function ParentReportCard({ report }: { report: ParentReport }) {
    const structured = Boolean(report.summary || report.keyPoints.length || report.nextSteps.length)
    const [open, setOpen] = useState(!structured)
    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>{report.dateLabel}</CardTitle>
                    <CardDescription>Session with {report.mentorName}</CardDescription>
                </div>
                <FileText className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
                {report.summary && <p className="max-w-prose text-pretty leading-relaxed">{report.summary}</p>}
                {(report.keyPoints.length > 0 || report.nextSteps.length > 0) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {report.keyPoints.length > 0 && <ReportList title="Key points" items={report.keyPoints} />}
                        {report.nextSteps.length > 0 && <ReportList title="Next steps" items={report.nextSteps} />}
                    </div>
                )}
                {report.fullReport && structured && (
                    <Button variant="link" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                        {open ? 'Hide full report' : 'Read full report'}
                    </Button>
                )}
                {report.fullReport && open && <ReportMarkdown markdown={report.fullReport} />}
            </CardContent>
        </Card>
    )
}

function ReportMarkdown({ markdown }: { markdown: string }) {
    return (
        <div className="max-w-prose rounded-card bg-muted/50 p-5 leading-relaxed text-foreground sm:p-6">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h2: ({ children }) => <h2 className="mt-6 mb-3 border-b border-border pb-2 text-base font-semibold first:mt-0">{children}</h2>,
                    h3: ({ children }) => <h3 className="mt-5 mb-2 text-sm font-semibold first:mt-0">{children}</h3>,
                    p: ({ children }) => <p className="my-3 text-pretty first:mt-0 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>,
                    ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>,
                    a: ({ children }) => <span>{children}</span>,
                }}
            >
                {normalizeReportMarkdown(sanitizeReportContent(markdown))}
            </ReactMarkdown>
        </div>
    )
}

function ReportList({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <ul className="mt-1.5 space-y-1.5">
                {items.map((t, i) => (
                    <li key={`${i}:${t}`} className="flex gap-2 text-sm text-pretty">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                        {t}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function MentorCard({ data, w }: { data: ParentHomeData; w: Words }) {
    const m = data.mentor
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Mentor</p>
                {m ? (
                    <>
                        <div className="mt-3 flex items-center gap-3">
                            <Avatar name={m.name} src={m.photoUrl} size="lg" />
                            <div className="min-w-0">
                                <p className="font-semibold">{m.name}</p>
                                {m.college && <p className="text-sm text-muted-foreground">{m.college}</p>}
                            </div>
                        </div>
                        {m.subject && (
                            <Badge tone="blue" className="mt-3">
                                <GraduationCap weight="bold" />
                                {m.subject}
                            </Badge>
                        )}
                        {m.bio && <p className="mt-3 line-clamp-5 text-sm text-pretty text-muted-foreground">{m.bio}</p>}
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

function ordinal(n: number) {
    const s = ['th', 'st', 'nd', 'rd']
    const d = n % 100
    return n + (s[(d - 20) % 10] || s[d] || s[0])
}

function Goals({ data, w }: { data: ParentHomeData; w: Words }) {
    const goal = data.goal
    if (!goal) {
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
    const { thresholds, completed } = data.milestones
    // Show reached milestones plus the next one, so it never runs to 100 early.
    const nextIndex = thresholds.findIndex((n) => n > completed)
    const shown = nextIndex === -1 ? thresholds : thresholds.slice(0, Math.max(nextIndex + 1, 4))
    const next = nextIndex === -1 ? null : thresholds[nextIndex]
    return (
        <Card>
            <CardContent>
                <p className="text-sm text-muted-foreground">Goals and milestones</p>
                <div className="mt-3 flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                        <Target weight="duotone" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">{[goal.university, goal.course].filter(Boolean).join(' · ')}</p>
                        {goal.entryYear && <p className="text-sm text-muted-foreground">{goal.entryYear} entry</p>}
                    </div>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2">
                    {shown.map((n) => {
                        const reached = completed >= n
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
                {next !== null && (
                    <p className="mt-3 text-sm text-muted-foreground">
                        {next - completed} {next - completed === 1 ? 'session' : 'sessions'} to the next milestone.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

/**
 * The parent's one write. Posts to /api/parent/request-hours, which checks
 * the link and files it for the team; `onRequest` replaces that in the mockup.
 */
function RequestHours({ hoursLeft, w, onRequest }: { hoursLeft: number; w: Words; onRequest?: () => Promise<boolean> }) {
    const [open, setOpen] = useState(false)
    const [note, setNote] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const send = async () => {
        setSending(true)
        try {
            const ok = onRequest
                ? await onRequest()
                : await fetch('/api/parent/request-hours', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ message: note }),
                  }).then(async (res) => {
                      if (!res.ok) toast.error((await res.json().catch(() => null))?.error || 'Could not send the request')
                      return res.ok
                  })
            if (ok) {
                setSent(true)
                setOpen(false)
                toast.success('Request sent. The team will be in touch.')
            }
        } catch {
            toast.error('Could not send the request')
        } finally {
            setSending(false)
        }
    }

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
                    <Button variant="secondary" onClick={() => setOpen(true)}>
                        Request more hours
                    </Button>
                )}
            </CardContent>
            <Dialog open={open} onOpenChange={(o) => !sending && setOpen(o)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request more hours</DialogTitle>
                        <DialogDescription>The team will get in touch about hours for {w.child}.</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        <Field label="Anything we should know?" htmlFor="hours-note" optional>
                            <Textarea id="hours-note" value={note} maxLength={1000} rows={4} onChange={(e) => setNote(e.target.value)} placeholder="For example, how many hours you have in mind." />
                        </Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
                            Cancel
                        </Button>
                        <Button onClick={send} loading={sending}>
                            Send request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
