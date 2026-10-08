'use client'

import { useMemo, useState } from 'react'
import { CalendarBlank as Calendar, ArrowCounterClockwise as RefreshCcw, FloppyDisk as Save, VideoCamera as Video, WarningCircle as AlertCircle, CheckCircle as CheckCircle2, MagnifyingGlass as Search } from '@phosphor-icons/react/ssr'

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
            return 'bg-tint-green text-tint-green-foreground'
        case 'completed':
            return 'bg-tint-blue text-tint-blue-foreground'
        case 'cancelled':
            return 'bg-tint-rose text-tint-rose-foreground'
        default:
            return 'bg-muted text-foreground'
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
            <div className="bg-card rounded-card border border-border p-12 text-center">
                <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="size-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No sessions found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    Once students start booking mentorship sessions, you&apos;ll be able to manage them here.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex gap-2 p-1.5 bg-muted rounded-card w-fit">
                    <button
                        type="button"
                        onClick={() => setFilter('upcoming')}
                        className={`px-4 py-2 rounded-control text-sm font-semibold transition-[background-color,box-shadow,color] duration-150 ${
                            filter === 'upcoming'
                                ? 'bg-card text-primary shadow-border'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Upcoming
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('past')}
                        className={`px-4 py-2 rounded-control text-sm font-semibold transition-[background-color,box-shadow,color] duration-150 ${
                            filter === 'past'
                                ? 'bg-card text-primary shadow-border'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Past
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-control text-sm font-semibold transition-[background-color,box-shadow,color] duration-150 ${
                            filter === 'all'
                                ? 'bg-card text-primary shadow-border'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        All
                    </button>
                </div>

                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by student or mentor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 pe-3.5 pl-10"
                    />
                </div>
            </div>

            <div className="bg-card rounded-card border border-border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/60 border-b border-border">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">
                                Student
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">
                                Mentor
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">
                                Session time
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">
                                Status
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredSessions.map((session) => {
                            const currentMentorId = selectedMentors[session.id] ?? session.mentorId
                            const hasChanged = currentMentorId !== session.mentorId
                            const isSaving = !!saving[session.id]
                            const hasError = !!errors[session.id]
                            const isSuccess = !!success[session.id]

                            return (
                                <tr key={session.id} className="hover:bg-muted/60 transition-colors align-top">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                                                {session.studentName?.[0] || 'S'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-foreground">
                                                    {session.studentName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Student ID: {session.studentId}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-muted-foreground">
                                                Mentor
                                            </label>
                                            <select
                                                value={currentMentorId}
                                                onChange={(e) =>
                                                    handleMentorChange(session.id, e.target.value)
                                                }
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                            >
                                                {sortedMentors.map((mentor) => (
                                                    <option key={mentor.id} value={mentor.id}>
                                                        {mentor.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-muted-foreground">
                                                Previously: <span className="font-medium">{session.mentorName}</span>
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-2 text-sm text-foreground">
                                            <Calendar className="size-4 mt-0.5 text-muted-foreground" />
                                            <div className="flex flex-col">
                                                <span>{formatDateTime(session.scheduledAt)}</span>
                                                <span className="text-xs text-muted-foreground">
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
                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-control text-sm font-semibold border transition-[background-color,box-shadow,color] duration-150 ${
                                                    !hasChanged || isSaving
                                                        ? 'border-border text-muted-foreground bg-muted/60 cursor-not-allowed'
                                                        : 'border-primary/20 bg-primary text-white hover:bg-primary/90 shadow-border'
                                                }`}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <RefreshCcw className="size-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="size-4" />
                                                        Save
                                                    </>
                                                )}
                                            </button>
                                            {hasError && (
                                                <div className="flex items-center gap-1 text-xs text-destructive max-w-xs text-right">
                                                    <AlertCircle className="size-3 shrink-0" />
                                                    <span>{errors[session.id]}</span>
                                                </div>
                                            )}
                                            {isSuccess && !hasError && (
                                                <div className="flex items-center gap-1 text-xs text-success">
                                                    <CheckCircle2 className="size-3" />
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
                <p className="text-center text-muted-foreground py-8 text-sm">
                    No sessions match your current filters.
                </p>
            )}
        </div>
    )
}

