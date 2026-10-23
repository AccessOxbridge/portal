import { CalendarBlank, Clock, FileText, VideoCamera } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/server'
import { loadParentSessions, requireParent, timezoneLabel, type ParentSessionRow } from '@/lib/parent-dashboard'
import { ParentFootnote, ParentHeading, Rise } from '@/components/parent/parent-home'
import { wordsFor } from '@/lib/parent-words'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

const STATUS: Record<Exclude<ParentSessionRow['status'], 'upcoming'>, { label: string; tone: 'neutral' | 'rose' | 'amber' }> = {
    completed: { label: 'Completed', tone: 'neutral' },
    cancelled: { label: 'Cancelled', tone: 'rose' },
    unconfirmed: { label: 'Not confirmed', tone: 'amber' },
}

/** Upcoming and past sessions, read-only: no join, cancel or reschedule. */
export default async function ParentSessionsPage() {
    const supabase = await createClient()
    const ctx = await requireParent(supabase)
    const rows = await loadParentSessions(supabase, ctx)
    const w = wordsFor(ctx.childFirstName)
    const upcoming = rows.filter((r) => r.status === 'upcoming')
    const past = rows.filter((r) => r.status !== 'upcoming')

    return (
        <div className="mx-auto max-w-3xl pb-16">
            <ParentHeading childFirstName={ctx.childFirstName} title="Sessions" />
            <div className="mt-8 space-y-8">
                {rows.length === 0 ? (
                    <Rise i={1}>
                        <Card>
                            <EmptyState icon={CalendarBlank} title={`${w.Childs} first session will appear here`} description="Upcoming and past sessions are listed here once booked." />
                        </Card>
                    </Rise>
                ) : (
                    <>
                        <Rise i={1}>
                            <section>
                                <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
                                {upcoming.length ? (
                                    <SessionList rows={upcoming} />
                                ) : (
                                    <Card className="px-5 py-4 text-sm text-muted-foreground">No upcoming sessions booked.</Card>
                                )}
                            </section>
                        </Rise>
                        {past.length > 0 && (
                            <Rise i={2}>
                                <section>
                                    <h2 className="mb-3 text-lg font-semibold">Past sessions</h2>
                                    <SessionList rows={past} />
                                </section>
                            </Rise>
                        )}
                    </>
                )}
            </div>
            <ParentFootnote childFirstName={ctx.childFirstName} timezoneLabel={timezoneLabel(ctx.timezone)} />
        </div>
    )
}

function SessionList({ rows }: { rows: ParentSessionRow[] }) {
    return (
        <Card>
            <ul className="divide-y divide-border">
                {rows.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                        {s.status === 'upcoming' ? <CalendarBlank className="size-5 text-brand" /> : <Clock className="size-5 text-muted-foreground" />}
                        <div className="min-w-0 flex-1">
                            <p className="font-medium">
                                {s.dateLabel} · <span className="tabular-nums">{s.timeLabel}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                with {s.mentorName}
                                {s.minutes ? <span className="tabular-nums"> · {s.minutes} min</span> : null}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {s.status === 'upcoming' ? (
                                <Badge tone="green">Booked</Badge>
                            ) : (
                                <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                            )}
                            {s.hasReport && (
                                <Badge tone="blue">
                                    <FileText weight="bold" />
                                    Report
                                </Badge>
                            )}
                            {s.hasRecording && (
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
    )
}
