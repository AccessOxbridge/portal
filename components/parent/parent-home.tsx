'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
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
    FileText,
    GraduationCap,
    Headset,
    Hourglass,
    Medal,
    Target,
    UserCircle,
} from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { ProgressRing } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { normalizeReportMarkdown, sanitizeReportContent } from '@/lib/report-utils'
import type { ParentHomeData, ParentReport } from '@/lib/parent-dashboard'
import { SUCCESS_MANAGER, wordsFor, type ParentWords } from '@/lib/parent-words'
import { EXAMPLE_REPORT } from '@/lib/parent-examples'
import { AboutCard } from '@/components/parent/about-card'
import { StudentProfileCard } from '@/components/parent/student-profile-card'

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

/** Page title shared by every parent page. */
export function ParentHeading({ title }: { title: string }) {
    return (
        <Rise i={0}>
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        </Rise>
    )
}

/**
 * The eight widgets from "Confirmed Dashboard Widgets", each with a live and
 * an empty state. Two columns on wide screens, like the rest of the portal:
 * the child's activity on the left, the people and plan on the right.
 */
export function ParentHome({ data, onRequestHours }: { data: ParentHomeData; onRequestHours?: () => Promise<boolean> }) {
    const w = wordsFor(data.childFirstName)
    const c = data.checklist
    // Every Getting started step done: the checklist has nothing left to say.
    const onboarded = c.submitted && c.offered && c.enrolled && c.learning
    let i = 1
    return (
        <div className="mx-auto max-w-6xl pb-16">
            <ParentHeading title={`${data.greeting}, ${data.parentFirstName}`} />

            <div className="mt-8 grid items-start gap-6 xl:grid-cols-3">
                <div className="min-w-0 space-y-6 xl:col-span-2">
                    <Rise i={i++}>
                        <AboutCard />
                    </Rise>
                    <Rise i={i++}>
                        <StudentProfileCard info={data.studentInfo} documents={data.documents} words={w} />
                    </Rise>
                    {!onboarded && (
                        <Rise i={i++}>
                            <Onboarding data={data} w={w} />
                        </Rise>
                    )}
                    <Rise i={i++}>
                        <NextSession data={data} w={w} />
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
                                <ExampleReport childFirstName={data.childFirstName} />
                            )}
                        </section>
                    </Rise>
                </div>

                {/* Two across under the main column on mid-size screens; a side column on wide ones. */}
                <div className="grid min-w-0 items-start gap-6 sm:grid-cols-2 xl:grid-cols-1">
                    <Rise i={i++}>
                        <MentorCard data={data} w={w} />
                    </Rise>
                    <Rise i={i++}>
                        <SuccessManagerCard w={w} />
                    </Rise>
                    <Rise i={i++}>
                        <Goals data={data} w={w} />
                    </Rise>
                    {data.hoursLeft !== null && (
                        <Rise i={i++}>
                            <RequestHours hoursLeft={data.hoursLeft} w={w} onRequest={onRequestHours} />
                        </Rise>
                    )}
                </div>
            </div>
        </div>
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
        { label: 'Submit student information', hint: 'Upload documents', done: c.submitted },
        { label: 'Receive an offer to join the programme', hint: 'This will be finalised in your 1:1 consultation', done: c.offered },
        { label: 'Enrolment', hint: `${w.Childs} place is confirmed and an Oxbridge mentor is matched`, done: c.enrolled },
        { label: 'Learning begins', hint: `${w.Childs} first session with their mentor is booked`, done: c.learning },
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
                        title={data.checklist.learning ? 'No upcoming session booked' : `${w.Childs} first session will appear here`}
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

/** Before the first report: say where reports will appear, and show an example of one. */
export function ExampleReport({ childFirstName }: { childFirstName: string | null }) {
    const w = wordsFor(childFirstName)
    return (
        <div className="space-y-3">
            <p className="text-sm text-pretty text-muted-foreground">
                {w.Childs} mentor writes a report after every session, and it appears here. This is an example of what you’ll see.
            </p>
            <ParentReportCard report={EXAMPLE_REPORT} example />
        </div>
    )
}

/**
 * One session report. Older reports have a summary with key points and next
 * steps; newer ones a written report. Shows whichever exists, and the
 * written report behind a toggle when both do.
 */
export function ParentReportCard({ report, example = false }: { report: ParentReport; example?: boolean }) {
    const structured = Boolean(report.summary || report.keyPoints.length || report.nextSteps.length)
    const [open, setOpen] = useState(!structured)
    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>{report.dateLabel}</CardTitle>
                    <CardDescription>Session with {report.mentorName}</CardDescription>
                </div>
                {example ? <Badge tone="outline">Example</Badge> : <FileText className="size-5 text-muted-foreground" />}
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
                    {SUCCESS_MANAGER.photo ? (
                        <Image src={SUCCESS_MANAGER.photo} alt={SUCCESS_MANAGER.name} width={96} height={96} className="size-12 shrink-0 rounded-full object-cover" />
                    ) : (
                        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-foreground">
                            <Headset weight="duotone" className="size-6" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-semibold">{SUCCESS_MANAGER.name}</p>
                        <p className="text-sm text-muted-foreground">{SUCCESS_MANAGER.title}</p>
                    </div>
                </div>
                <p className="mt-3 text-sm text-pretty text-muted-foreground">Your contact for anything about {w.childs} programme.</p>
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
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-foreground">
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
