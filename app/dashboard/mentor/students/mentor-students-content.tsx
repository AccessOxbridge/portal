'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    Search,
    Users,
    CalendarCheck,
    CalendarClock,
    FileWarning,
    GraduationCap,
    Target,
    Mail,
    MessageCircle,
    CalendarPlus,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react'
import { formatDateInTz } from '@/lib/timezone'
import MentorRequestSessionModal from '@/components/dashboard/mentor-request-session-modal'

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
        { label: 'Active students', value: summary.activeStudents, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
        { label: 'Sessions completed', value: summary.sessionsCompleted, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Upcoming sessions', value: summary.upcomingSessions, icon: CalendarClock, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Pending reports', value: summary.pendingReports, icon: FileWarning, color: 'text-amber-600', bg: 'bg-amber-100' },
    ]

    return (
        <div className="space-y-8">
            {/* Summary */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((c) => (
                    <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
                            <c.icon className={`w-5 h-5 ${c.color}`} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900 leading-none">{c.value}</p>
                        <p className="text-sm text-gray-500 mt-1.5">{c.label}</p>
                    </div>
                ))}
            </section>

            {students.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">No students assigned yet</h3>
                    <p className="text-gray-500 max-w-sm">
                        Once students are matched with you, you&apos;ll see their progress and session activity here.
                    </p>
                </div>
            ) : (
                <>
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search students…"
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500 shrink-0">Sort by</label>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as SortKey)}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm bg-white"
                            >
                                {SORT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Student cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {visible.map((s) => (
                            <div
                                key={s.id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                                        {s.photo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={s.photo_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            (s.full_name?.[0] || 'S').toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-gray-900 truncate">{s.full_name}</h3>
                                            {s.profile_complete ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3" /> Profile complete
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                                    <AlertCircle className="w-3 h-3" /> Profile incomplete
                                                </span>
                                            )}
                                        </div>
                                        {s.email && (
                                            <a
                                                href={`mailto:${s.email}`}
                                                className="inline-flex items-center gap-1.5 max-w-full text-sm text-gray-500 hover:text-accent transition-colors mt-0.5"
                                            >
                                                <Mail className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{s.email}</span>
                                            </a>
                                        )}
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                                            {s.target_university && (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <GraduationCap className="w-4 h-4 text-gray-400" />
                                                    {s.target_university}
                                                </span>
                                            )}
                                            {s.target_course && (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Target className="w-4 h-4 text-gray-400" />
                                                    {s.target_course}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
                                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                                        <p className="text-xl font-bold text-gray-900 leading-none">{s.sessions_completed}</p>
                                        <p className="text-[11px] text-gray-500 mt-1">Completed</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                                        <p className="text-xl font-bold text-gray-900 leading-none">{s.upcoming_sessions}</p>
                                        <p className="text-[11px] text-gray-500 mt-1">Upcoming</p>
                                    </div>
                                    <div
                                        className={`rounded-xl p-3 text-center ${
                                            s.pending_reports > 0 ? 'bg-amber-50' : 'bg-gray-50'
                                        }`}
                                    >
                                        <p
                                            className={`text-xl font-bold leading-none ${
                                                s.pending_reports > 0 ? 'text-amber-700' : 'text-gray-900'
                                            }`}
                                        >
                                            {s.pending_reports}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">Reports due</p>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-xs text-gray-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarClock className="w-3.5 h-3.5 text-gray-400" />
                                        Next:{' '}
                                        <span className="font-semibold text-gray-700">
                                            {fmtDate(s.next_session_at, timezone) || 'Not scheduled'}
                                        </span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                                        Last:{' '}
                                        <span className="font-semibold text-gray-700">
                                            {fmtDate(s.last_session_at, timezone) || '—'}
                                        </span>
                                    </span>
                                </div>

                                <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        Assigned {fmtDate(s.assigned_at, timezone)}
                                    </span>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setRequestStudentId(s.id)}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:translate-x-0.5 transition-transform"
                                        >
                                            <CalendarPlus className="w-4 h-4" />
                                            Request session
                                        </button>
                                        <Link
                                            href="/dashboard/mentor/messages"
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:translate-x-0.5 transition-transform"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Message
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {visible.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm">
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
