'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    MagnifyingGlass as Search,
    Users,
    CalendarCheck,
    CalendarDots as CalendarClock,
    FileX as FileWarning,
    GraduationCap,
    Target,
    Envelope as Mail,
    ChatCircle as MessageCircle,
    CalendarPlus,
    CheckCircle as CheckCircle2,
    WarningCircle as AlertCircle,
} from '@phosphor-icons/react/ssr'
import { SelectField } from '@/components/ui/select'
import { formatDateInTz } from '@/lib/timezone'
import MentorRequestSessionModal from '@/components/dashboard/mentor-request-session-modal'
import { Avatar } from '@/components/ui/avatar'

export interface StudentMetric {
    id: string
    full_name: string
    email: string | null
    photo_url: string | null
    assigned_at: string
    total_sessions: number
    sessions_completed: number
    upcoming_sessions: number
    next_session_at: string | null
    last_session_at: string | null
    pending_reports: number
    target_university: string | null
    target_course: string | null
    profile_complete: boolean
}

interface Props {
    students: StudentMetric[]
    summary: {
        activeStudents: number
        sessionsCompleted: number
        upcomingSessions: number
        pendingReports: number
    }
    timezone: string | null
}

type SortKey = 'recent' | 'name' | 'sessions' | 'upcoming' | 'pending'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'recent', label: 'Recently assigned' },
    { value: 'name', label: 'Name (A–Z)' },
    { value: 'sessions', label: 'Most sessions' },
    { value: 'upcoming', label: 'Upcoming sessions' },
    { value: 'pending', label: 'Pending reports' },
]

function fmtDate(iso: string | null, tz: string | null) {
    if (!iso) return null
    return formatDateInTz(iso, tz, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MentorStudentsContent({ students, summary, timezone }: Props) {
    const [query, setQuery] = useState('')
    const [sort, setSort] = useState<SortKey>('recent')
    const [requestStudentId, setRequestStudentId] = useState<string | null>(null)

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        let list = students
        if (q) {
            list = students.filter(
                (s) =>
                    s.full_name.toLowerCase().includes(q) ||
                    (s.email || '').toLowerCase().includes(q) ||
                    (s.target_university || '').toLowerCase().includes(q) ||
                    (s.target_course || '').toLowerCase().includes(q)
            )
        }
        const sorted = list.slice()
        switch (sort) {
            case 'name':
                sorted.sort((a, b) => a.full_name.localeCompare(b.full_name))
                break
            case 'sessions':
                sorted.sort((a, b) => b.sessions_completed - a.sessions_completed)
                break
            case 'upcoming':
                sorted.sort((a, b) => b.upcoming_sessions - a.upcoming_sessions)
                break
            case 'pending':
                sorted.sort((a, b) => b.pending_reports - a.pending_reports)
                break
            default:
                sorted.sort(
                    (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
                )
        }
        return sorted
    }, [students, query, sort])

    const summaryCards = [
        { label: 'Active students', value: summary.activeStudents, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Sessions completed', value: summary.sessionsCompleted, icon: CalendarCheck, color: 'text-brand', bg: 'bg-tint-blue' },
        { label: 'Upcoming sessions', value: summary.upcomingSessions, icon: CalendarClock, color: 'text-success', bg: 'bg-tint-green' },
        { label: 'Pending reports', value: summary.pendingReports, icon: FileWarning, color: 'text-warning', bg: 'bg-tint-amber' },
    ]

    return (
        <div className="space-y-8">
            {/* Summary */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((c) => (
                    <div key={c.label} className="border border-transparent bg-card rounded-card shadow-border p-5">
                        <div className={`size-11 ${c.bg} rounded-control flex items-center justify-center mb-4`}>
                            <c.icon className={`size-5 ${c.color}`} />
                        </div>
                        <p className="text-3xl font-semibold text-foreground leading-none">{c.value}</p>
                        <p className="text-sm text-muted-foreground mt-1.5">{c.label}</p>
                    </div>
                ))}
            </section>

            {students.length === 0 ? (
                <div className="border border-transparent bg-card rounded-card shadow-border py-20 flex flex-col items-center justify-center text-center">
                    <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mb-4">
                        <Users className="size-8 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No students assigned yet</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Once students are matched with you, you&apos;ll see their progress and session activity here.
                    </p>
                </div>
            ) : (
                <>
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search students…"
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 pe-3.5 pl-10"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-muted-foreground shrink-0">Sort by</label>
                            <SelectField
                                value={sort}
                                onChange={(e) => setSort(e.target.value as SortKey)}
                                aria-label="Sort students"
                                className="w-48"
                            >
                                {SORT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </SelectField>
                        </div>
                    </div>

                    {/* Student cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {visible.map((s) => (
                            <div
                                key={s.id}
                                className="border border-transparent bg-card rounded-card shadow-border hover:shadow-border transition-shadow p-6"
                            >
                                <div className="flex items-start gap-4">
                                    <Avatar name={s.full_name || 'Student'} src={s.photo_url} size="lg" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-foreground truncate">{s.full_name}</h3>
                                            {s.profile_complete ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-tint-green-foreground bg-tint-green border border-border px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="size-3" /> Profile complete
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-tint-amber-foreground bg-tint-amber border border-border px-2 py-0.5 rounded-full">
                                                    <AlertCircle className="size-3" /> Profile incomplete
                                                </span>
                                            )}
                                        </div>
                                        {s.email && (
                                            <a
                                                href={`mailto:${s.email}`}
                                                className="inline-flex items-center gap-1.5 max-w-full text-sm text-muted-foreground hover:text-primary transition-colors mt-0.5"
                                            >
                                                <Mail className="size-3.5 shrink-0" />
                                                <span className="truncate">{s.email}</span>
                                            </a>
                                        )}
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                            {s.target_university && (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <GraduationCap className="size-4 text-muted-foreground" />
                                                    {s.target_university}
                                                </span>
                                            )}
                                            {s.target_course && (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Target className="size-4 text-muted-foreground" />
                                                    {s.target_course}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
                                    <div className="rounded-control bg-muted/60 p-3 text-center">
                                        <p className="text-xl font-semibold text-foreground leading-none">{s.sessions_completed}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Completed</p>
                                    </div>
                                    <div className="rounded-control bg-muted/60 p-3 text-center">
                                        <p className="text-xl font-semibold text-foreground leading-none">{s.upcoming_sessions}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Upcoming</p>
                                    </div>
                                    <div
                                        className={`rounded-control p-3 text-center ${
                                            s.pending_reports > 0 ? 'bg-tint-amber' : 'bg-muted/60'
                                        }`}
                                    >
                                        <p
                                            className={`text-xl font-semibold leading-none ${
                                                s.pending_reports > 0 ? 'text-tint-amber-foreground' : 'text-foreground'
                                            }`}
                                        >
                                            {s.pending_reports}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Reports due</p>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarClock className="size-3.5 text-muted-foreground" />
                                        Next:{' '}
                                        <span className="font-semibold text-foreground">
                                            {fmtDate(s.next_session_at, timezone) || 'Not scheduled'}
                                        </span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarCheck className="size-3.5 text-muted-foreground" />
                                        Last:{' '}
                                        <span className="font-semibold text-foreground">
                                            {fmtDate(s.last_session_at, timezone) || 'None'}
                                        </span>
                                    </span>
                                </div>

                                <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-4">
                                    <span className="text-xs text-muted-foreground">
                                        Assigned {fmtDate(s.assigned_at, timezone)}
                                    </span>
                                    <div className="flex items-center gap-4 whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => setRequestStudentId(s.id)}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:translate-x-0.5 transition-transform"
                                        >
                                            <CalendarPlus className="size-4" />
                                            Request session
                                        </button>
                                        <Link
                                            href="/dashboard/mentor/messages"
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:translate-x-0.5 transition-transform"
                                        >
                                            <MessageCircle className="size-4" />
                                            Message
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {visible.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            No students match &ldquo;{query}&rdquo;.
                        </div>
                    )}
                </>
            )}

            <MentorRequestSessionModal
                isOpen={!!requestStudentId}
                onClose={() => setRequestStudentId(null)}
                students={students.map((s) => ({ id: s.id, full_name: s.full_name }))}
                preselectedStudentId={requestStudentId || undefined}
                mentorTimezone={timezone}
            />
        </div>
    )
}
