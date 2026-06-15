'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Calendar, Video, FileText, Clock, ArrowRight, Users, MessageSquare } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Session {
    id: string
    scheduled_at: string | null
    duration_minutes: number
    status: string
    zoom_start_url: string | null
    zoom_join_url: string | null
    zoom_meeting_status: string | null
    student_full_name: string
    has_report: boolean
}

interface MentorSessionsContentProps {
    sessions: Session[]
    mentorId: string
}

export default function MentorSessionsContent({
    sessions,
    mentorId
}: MentorSessionsContentProps) {
    const [allSessions, setAllSessions] = useState<Session[]>(sessions)
    const [now, setNow] = useState<number>(() => Date.now())
    const [activeTab, setActiveTab] = useState<'upcoming' | 'current' | 'past'>('upcoming')
    const [reportSessionId, setReportSessionId] = useState<string | null>(null)
    const [showReportSuccess, setShowReportSuccess] = useState(false)
    const [reportSubmitting, setReportSubmitting] = useState(false)
    const [reportError, setReportError] = useState<string | null>(null)

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'TBD'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    useEffect(() => {
        setAllSessions(sessions)
    }, [sessions])

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now())
        }, 15000)
        return () => clearInterval(interval)
    }, [])

    const formatTime = (dateString: string | null) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const isSessionSoon = (dateString: string | null) => {
        if (!dateString) return false
        const sessionTime = new Date(dateString).getTime()
        const nowMs = now
        const oneHour = 60 * 60 * 1000
        return sessionTime - nowMs <= oneHour && sessionTime > nowMs
    }

    const classifySession = (session: Session, nowMs: number): 'upcoming' | 'current' | 'past' => {
        const status = session.status
        const zoomStatus = session.zoom_meeting_status

        if (status === 'completed' || status === 'cancelled' || zoomStatus === 'ended') {
            return 'past'
        }

        if (!session.scheduled_at) {
            return status === 'active' ? 'upcoming' : 'past'
        }

        const start = new Date(session.scheduled_at).getTime()
        const end = start + (session.duration_minutes ?? 60) * 60 * 1000

        if (zoomStatus === 'started') {
            return 'current'
        }

        if (nowMs < start) return 'upcoming'
        if (nowMs >= start && nowMs < end) return 'current'
        if (nowMs >= end) return 'past'

        return 'past'
    }

    const currentSessions = useMemo(() => {
        const nowMs = now
        return allSessions
            .filter(session => classifySession(session, nowMs) === 'current')
            .sort((a, b) => {
                if (!a.scheduled_at) return 1
                if (!b.scheduled_at) return -1
                return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            })
    }, [allSessions, now])

    const upcomingSessions = useMemo(() => {
        const nowMs = now
        return allSessions
            .filter(session => classifySession(session, nowMs) === 'upcoming')
            .sort((a, b) => {
                if (!a.scheduled_at) return 1
                if (!b.scheduled_at) return -1
                return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            })
    }, [allSessions, now])

    const pastSessions = useMemo(() => {
        const nowMs = now
        return allSessions
            .filter(session => classifySession(session, nowMs) === 'past')
            .sort((a, b) => {
                if (!a.scheduled_at) return 1
                if (!b.scheduled_at) return -1
                return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
            })
    }, [allSessions, now])

    // Default to the "Current" tab when a session is live, but only once —
    // otherwise this would snap the user back to "Current" every time they
    // tried to click another tab (e.g. "Upcoming"), making it unclickable.
    const didAutoSwitchToCurrent = useRef(false)
    useEffect(() => {
        if (!didAutoSwitchToCurrent.current && currentSessions.length > 0) {
            didAutoSwitchToCurrent.current = true
            setActiveTab('current')
        }
    }, [currentSessions.length])

    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel(`mentor-sessions-${mentorId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'sessions',
                    filter: `mentor_id=eq.${mentorId}`
                },
                (payload) => {
                    const updated: any = payload.new
                    setAllSessions(prev =>
                        prev.map(session =>
                            session.id === updated.id
                                ? {
                                    ...session,
                                    status: updated.status ?? session.status,
                                    zoom_meeting_status: updated.zoom_meeting_status ?? session.zoom_meeting_status,
                                    scheduled_at: updated.scheduled_at ?? session.scheduled_at,
                                    duration_minutes: updated.duration_minutes ?? session.duration_minutes
                                }
                                : session
                        )
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [mentorId])

    const sessionsForTab = activeTab === 'current'
        ? currentSessions
        : activeTab === 'upcoming'
            ? upcomingSessions
            : pastSessions

    return (
        <div className="space-y-8">
            {showReportSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center justify-between">
                    <span className="font-semibold">Report successfully submitted.</span>
                    <button
                        type="button"
                        onClick={() => setShowReportSuccess(false)}
                        className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
                    >
                        Dismiss
                    </button>
                </div>
            )}
            {/* Tab Switcher */}
            <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'upcoming'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Upcoming
                    {upcomingSessions.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs">
                            {upcomingSessions.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('current')}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'current'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Current
                    {currentSessions.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                            {currentSessions.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'past'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Completed
                    {pastSessions.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                            {pastSessions.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Sessions List */}
            {sessionsForTab.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <Calendar className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {activeTab === 'upcoming' && 'No upcoming sessions'}
                        {activeTab === 'current' && 'No current sessions'}
                        {activeTab === 'past' && 'No completed sessions'}
                    </h3>
                    <p className="text-gray-500 max-w-sm">
                        {activeTab === 'upcoming' && 'Once students book sessions with you, they will appear here.'}
                        {activeTab === 'past' && 'Your completed sessions will appear here.'}
                    </p>
                    {activeTab === 'upcoming' && (
                        <Link
                            href="/dashboard/mentor/requests"
                            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                        >
                            <Users className="w-4 h-4" />
                            View Requests
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {sessionsForTab.map((session) => (
                        <div
                            key={session.id}
                            className="p-6 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-gray-200/50 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    {/* Student Avatar */}
                                    <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center text-lg font-bold shrink-0">
                                        {session.student_full_name?.[0] || 'S'}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            Session with {session.student_full_name}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(session.scheduled_at)}
                                            </span>
                                            {session.scheduled_at && (
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4" />
                                                    {formatTime(session.scheduled_at)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        {activeTab === 'upcoming' && isSessionSoon(session.scheduled_at) && (
                                            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold animate-pulse">
                                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                                Starting soon
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {activeTab === 'upcoming' || activeTab === 'current' ? (
                                        <>
                                            {session.zoom_start_url ? (
                                                <a
                                                    href={`/api/sessions/${session.id}/start`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all ${isSessionSoon(session.scheduled_at)
                                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200'
                                                        : 'bg-accent text-white hover:scale-[1.02]'
                                                        }`}
                                                >
                                                    <Video className="w-4 h-4" />
                                                    Start Session
                                                </a>
                                            ) : session.zoom_join_url ? (
                                                <a
                                                    href={session.zoom_join_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all ${isSessionSoon(session.scheduled_at)
                                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200'
                                                        : 'bg-accent text-white hover:scale-[1.02]'
                                                        }`}
                                                >
                                                    <Video className="w-4 h-4" />
                                                    Join Session
                                                </a>
                                            ) : (
                                                <span className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium">
                                                    Zoom link coming soon
                                                </span>
                                            )}
                                            {activeTab === 'current' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setReportSessionId(session.id)}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Report
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {!session.has_report ? (
                                                <Link
                                                    href={`/dashboard/mentor/sessions/${session.id}/report`}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Submit Report
                                                </Link>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-100 text-green-700 font-medium rounded-xl">
                                                    <FileText className="w-4 h-4" />
                                                    Report Submitted
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {reportSessionId && (
                <div className="fixed inset-0 z-40 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => { setReportSessionId(null); setReportError(null) }}
                    />
                    <div className="relative z-50 w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-900">Report a Problem</h2>
                                <p className="text-sm text-gray-500 mt-1">Let us know if your student didn&apos;t show up.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setReportSessionId(null); setReportError(null) }}
                                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500 text-sm font-semibold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                <p className="text-sm text-gray-800 font-medium">
                                    Is the student absent?
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Only use this if your student hasn&apos;t joined the Zoom room after the scheduled start time.
                                </p>
                            </div>
                            {reportError && (
                                <p className="text-sm text-red-600">{reportError}</p>
                            )}
                            <button
                                type="button"
                                disabled={reportSubmitting}
                                onClick={async () => {
                                    if (!reportSessionId) return
                                    setReportSubmitting(true)
                                    setReportError(null)
                                    try {
                                        const res = await fetch('/api/mentor/report-student-absent', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ session_id: reportSessionId })
                                        })
                                        const data = await res.json().catch(() => ({}))
                                        if (!res.ok) {
                                            setReportError(data.error || 'Failed to submit report')
                                            return
                                        }
                                        setReportSessionId(null)
                                        setShowReportSuccess(true)
                                        setTimeout(() => setShowReportSuccess(false), 4000)
                                    } catch {
                                        setReportError('Something went wrong. Please try again.')
                                    } finally {
                                        setReportSubmitting(false)
                                    }
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {reportSubmitting ? 'Submitting…' : 'Yes, student is absent'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
