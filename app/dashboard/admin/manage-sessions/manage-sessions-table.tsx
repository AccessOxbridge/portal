'use client'

import { useMemo, useState } from 'react'
import { Calendar, RefreshCcw, Save, Video, AlertCircle, CheckCircle2, Search } from 'lucide-react'

interface SessionRow {
    id: string
    scheduledAt: string | null
    status: string
    studentName: string
    studentId: string
    mentorName: string
    mentorId: string
}

interface MentorOption {
    id: string
    name: string
}

interface Props {
    sessions: SessionRow[]
    mentors: MentorOption[]
}

type FilterTab = 'upcoming' | 'past' | 'all'

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'active':
            return 'bg-emerald-50 text-emerald-700'
        case 'completed':
            return 'bg-blue-50 text-blue-700'
        case 'cancelled':
            return 'bg-red-50 text-red-700'
        default:
            return 'bg-gray-100 text-gray-700'
    }
}

export default function ManageSessionsTable({ sessions, mentors }: Props) {
    const [filter, setFilter] = useState<FilterTab>('upcoming')
    const [search, setSearch] = useState('')
    const [selectedMentors, setSelectedMentors] = useState<Record<string, string>>(
        () =>
            sessions.reduce((acc, s) => {
                acc[s.id] = s.mentorId
                return acc
            }, {} as Record<string, string>)
    )
    const [saving, setSaving] = useState<Record<string, boolean>>({})
    const [errors, setErrors] = useState<Record<string, string | null>>({})
    const [success, setSuccess] = useState<Record<string, boolean>>({})

    const sortedMentors = useMemo(
        () =>
            [...mentors].sort((a, b) =>
                a.name.localeCompare(b.name)
            ),
        [mentors]
    )

    const classifySession = (session: SessionRow): FilterTab => {
        const status = session.status
        if (status === 'completed' || status === 'cancelled') return 'past'

        const hasDate = !!session.scheduledAt
        if (!hasDate) {
            return status === 'active' ? 'upcoming' : 'past'
        }

        const scheduled = new Date(session.scheduledAt!).getTime()
        const now = Date.now()

        if (status === 'active' && scheduled >= now) return 'upcoming'
        if (scheduled < now) return 'past'
        return 'all'
    }

    const filteredSessions = useMemo(() => {
        const lowerSearch = search.toLowerCase()

        return sessions
            .filter((s) => {
                if (filter === 'all') return true
                return classifySession(s) === filter
            })
            .filter((s) => {
                if (!lowerSearch) return true
                return (
                    s.studentName.toLowerCase().includes(lowerSearch) ||
                    s.mentorName.toLowerCase().includes(lowerSearch)
                )
            })
            .sort((a, b) => {
                if (!a.scheduledAt) return 1
                if (!b.scheduledAt) return -1
                return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
            })
    }, [sessions, filter, search])

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return 'TBD'
        const date = new Date(dateStr)
        const datePart = date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        const timePart = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        })
        return `${datePart} • ${timePart}`
    }

    const handleMentorChange = (sessionId: string, mentorId: string) => {
        setSelectedMentors((prev) => ({
            ...prev,
            [sessionId]: mentorId,
        }))
        setErrors((prev) => ({ ...prev, [sessionId]: null }))
        setSuccess((prev) => ({ ...prev, [sessionId]: false }))
    }

    const handleSave = async (session: SessionRow) => {
        const newMentorId = selectedMentors[session.id]
        if (!newMentorId || newMentorId === session.mentorId) {
            setErrors((prev) => ({
                ...prev,
                [session.id]: 'Please select a different mentor before saving.',
            }))
            return
        }

        try {
            setSaving((prev) => ({ ...prev, [session.id]: true }))
            setErrors((prev) => ({ ...prev, [session.id]: null }))
            setSuccess((prev) => ({ ...prev, [session.id]: false }))

            const res = await fetch('/api/admin/sessions/reassign-mentor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: session.id,
                    new_mentor_id: newMentorId,
                }),
            })

            const data = await res.json().catch(() => ({}))

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to update session')
            }

            setSuccess((prev) => ({ ...prev, [session.id]: true }))
        } catch (err: any) {
            setErrors((prev) => ({
                ...prev,
                [session.id]: err?.message || 'Something went wrong. Please try again.',
            }))
        } finally {
            setSaving((prev) => ({ ...prev, [session.id]: false }))
        }
    }

    if (sessions.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sessions Found</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    Once students start booking mentorship sessions, you&apos;ll be able to manage them here.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
                    <button
                        type="button"
                        onClick={() => setFilter('upcoming')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            filter === 'upcoming'
                                ? 'bg-white text-accent shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Upcoming
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('past')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            filter === 'past'
                                ? 'bg-white text-accent shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Past
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            filter === 'all'
                                ? 'bg-white text-accent shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        All
                    </button>
                </div>

                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by student or mentor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Student
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Mentor
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Session Time
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Status
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredSessions.map((session) => {
                            const currentMentorId = selectedMentors[session.id] ?? session.mentorId
                            const hasChanged = currentMentorId !== session.mentorId
                            const isSaving = !!saving[session.id]
                            const hasError = !!errors[session.id]
                            const isSuccess = !!success[session.id]

                            return (
                                <tr key={session.id} className="hover:bg-gray-50 transition-colors align-top">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
                                                {session.studentName?.[0] || 'S'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {session.studentName}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Student ID: {session.studentId}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-gray-500">
                                                Mentor
                                            </label>
                                            <select
                                                value={currentMentorId}
                                                onChange={(e) =>
                                                    handleMentorChange(session.id, e.target.value)
                                                }
                                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
                                            >
                                                {sortedMentors.map((mentor) => (
                                                    <option key={mentor.id} value={mentor.id}>
                                                        {mentor.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-400">
                                                Previously: <span className="font-medium">{session.mentorName}</span>
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-2 text-sm text-gray-700">
                                            <Calendar className="w-4 h-4 mt-0.5 text-gray-400" />
                                            <div className="flex flex-col">
                                                <span>{formatDateTime(session.scheduledAt)}</span>
                                                <span className="text-xs text-gray-400">
                                                    Session ID: {session.id}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                getStatusClasses(session.status)
                                            }`}
                                        >
                                            {session.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-end gap-2">
                                            <button
                                                type="button"
                                                disabled={!hasChanged || isSaving}
                                                onClick={() => handleSave(session)}
                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                                                    !hasChanged || isSaving
                                                        ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                                                        : 'border-accent/20 bg-accent text-white hover:bg-accent/90 shadow-sm'
                                                }`}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <RefreshCcw className="w-4 h-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        Save
                                                    </>
                                                )}
                                            </button>
                                            {hasError && (
                                                <div className="flex items-center gap-1 text-xs text-red-600 max-w-xs text-right">
                                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                                    <span>{errors[session.id]}</span>
                                                </div>
                                            )}
                                            {isSuccess && !hasError && (
                                                <div className="flex items-center gap-1 text-xs text-emerald-600">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span>Mentor updated &amp; notified</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {filteredSessions.length === 0 && (
                <p className="text-center text-gray-500 py-8 text-sm">
                    No sessions match your current filters.
                </p>
            )}
        </div>
    )
}

