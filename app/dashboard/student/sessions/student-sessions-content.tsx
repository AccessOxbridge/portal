'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Video, FileText, MessageSquare, Clock, ArrowRight, Hourglass, Coins, XCircle, PlayCircle, X } from 'lucide-react'
import { useStudentCredits } from '@/components/dashboard/student-credits-provider'
import { createClient } from '@/utils/supabase/client'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import { MentorSessionRequestCard } from './mentor-session-request-card'

interface Session {
    id: string
    scheduled_at: string | null
    duration_minutes: number
    status: string
    zoom_join_url: string | null
    zoom_meeting_status: string | null
    mentor_full_name: string
    mentor_photo_url: string | null
    has_feedback: boolean
    has_report: boolean
    recording_available: boolean
}

interface PendingRequest {
    id: string
    created_at: string
    mentor_full_name: string
    initiated_by?: 'student' | 'mentor'
    proposed_start?: string | null
    proposed_end?: string | null
    note?: string | null
}

interface StudentSessionsContentProps {
    sessions: Session[]
    pendingRequests: PendingRequest[]
    credits: number
    canBook?: boolean
    hasMentor?: boolean
    autoOpenBooking?: boolean
    studentId: string
    timezone?: string | null
}

export default function StudentSessionsContent({
    sessions,
    pendingRequests,
    credits,
    canBook = false,
    hasMentor = false,
    autoOpenBooking = false,
    studentId,
    timezone = null
}: StudentSessionsContentProps) {
    const router = useRouter()
    // Booking is only possible once the profile is complete AND an admin has
    // assigned a mentor to this student.
    const bookingReady = canBook && hasMentor
    const { tryOpenBookSession, openCreditsRequest } = useStudentCredits()
    const [allSessions, setAllSessions] = useState<Session[]>(sessions)
    const [now, setNow] = useState<number>(() => Date.now())
    const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'current' | 'past'>(() => {
        const initialNow = Date.now()

        const classify = (session: Session): 'upcoming' | 'current' | 'past' => {
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

            if (initialNow < start) return 'upcoming'
            if (initialNow >= start && initialNow < end) return 'current'
            if (initialNow >= end) return 'past'

            return 'past'
        }

        const hasCurrent = sessions.some(s => classify(s) === 'current')

        if (hasCurrent) return 'current'
        if (pendingRequests.length > 0) return 'pending'
        return 'upcoming'
    })
    const [cancelling, setCancelling] = useState(false)
    const [hadCurrent, setHadCurrent] = useState(false)
    const [reportSessionId, setReportSessionId] = useState<string | null>(null)
    const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null)
    const [showReportSuccess, setShowReportSuccess] = useState(false)
    const [reportSubmitting, setReportSubmitting] = useState(false)
    const [reportError, setReportError] = useState<string | null>(null)

    // The booking modal is mounted globally by StudentCreditsProvider so the
    // sidebar CTA works on every page. When deep-linked here with ?book=1,
    // trigger that same shared flow (it gates on credits + a complete profile).
    useEffect(() => {
        if (autoOpenBooking && bookingReady) {
            tryOpenBookSession()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setAllSessions(sessions)
    }, [sessions])

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now())
        }, 15000)

        return () => clearInterval(interval)
    }, [])

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'TBD'
        return formatDateInTz(dateString, timezone)
    }

    const formatTime = (dateString: string | null) => {
        if (!dateString) return ''
        return formatTimeInTz(dateString, timezone)
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

    useEffect(() => {
        const hasCurrent = currentSessions.length > 0

        if (!hadCurrent && hasCurrent) {
            setActiveTab('current')
        } else if (hadCurrent && !hasCurrent && activeTab === 'current') {
            setActiveTab('past')
        }

        setHadCurrent(hasCurrent)
    }, [currentSessions.length, hadCurrent, activeTab])

    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel(`student-sessions-${studentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'sessions',
                    filter: `student_id=eq.${studentId}`
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
    }, [studentId])

    const studentInitiatedPending = pendingRequests.filter(r => (r.initiated_by || 'student') === 'student')

    const handleCancelAllPending = async () => {
        if (cancelling || studentInitiatedPending.length === 0) return
        setCancelling(true)
        try {
            const res = await fetch('/api/student/pending-requests/cancel', { method: 'POST' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Failed to cancel')
            router.refresh()
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Failed to cancel pending requests')
        } finally {
            setCancelling(false)
        }
    }

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
            {/* Credit Status Banner */}
            {credits === 0 && (pendingRequests.length > 0 || upcomingSessions.length > 0) && (
                <div className="p-6 bg-linear-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                Ready to start your sessions?
                            </h3>
                            <p className="text-gray-600">
                                You have {pendingRequests.length + upcomingSessions.length} mentorship request(s) waiting. Add credits now to ensure your sessions are confirmed.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => openCreditsRequest('topup')}
                        className="px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-accent/20 whitespace-nowrap"
                    >
                        Request credits
                    </button>
                </div>
            )}
            {/* Tab Switcher + Cancel all (pending only) */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'pending'
                            ? 'bg-white text-amber-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Pending
                        {pendingRequests.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
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
                        Past
                        {pastSessions.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                                {pastSessions.length}
                            </span>
                        )}
                    </button>
                </div>
                {activeTab === 'pending' && studentInitiatedPending.length > 0 && (
                    <button
                        type="button"
                        onClick={handleCancelAllPending}
                        disabled={cancelling}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <XCircle className="w-4 h-4 shrink-0" />
                        {cancelling ? 'Cancelling…' : 'Cancel my pending requests'}
                    </button>
                )}
            </div>

            {/* Pending Requests Tab */}
            {activeTab === 'pending' && (
                pendingRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <Hourglass className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            No pending requests
                        </h3>
                        <p className="text-gray-500 max-w-sm">
                            When you request a session with your mentor, it will appear here until they confirm a time.
                        </p>
                        {bookingReady ? (
                            <button
                                onClick={tryOpenBookSession}
                                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                            >
                                Book a Session
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : !canBook ? (
                            <Link
                                href="/dashboard/student/profile"
                                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                            >
                                Complete profile to book
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <p className="mt-6 text-sm text-gray-400 max-w-sm">
                                Your mentor will be assigned by the Access Oxbridge team. You can book a session as soon as they are assigned.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingRequests.map((request) => (
                            request.initiated_by === 'mentor' ? (
                                <MentorSessionRequestCard
                                    key={request.id}
                                    request={{
                                        id: request.id,
                                        mentor_full_name: request.mentor_full_name,
                                        proposed_start: request.proposed_start ?? null,
                                        note: request.note ?? null,
                                    }}
                                    timezone={timezone}
                                />
                            ) : (
                                <div
                                    key={request.id}
                                    className="p-6 bg-white rounded-2xl border border-amber-200 shadow-lg shadow-amber-100/50 hover:shadow-xl transition-all"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-bold shrink-0">
                                                {request.mentor_full_name?.[0] || 'M'}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                    Request sent to {request.mentor_full_name}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(request.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold">
                                            Awaiting Response
                                        </span>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )
            )}

            {/* Sessions List (Upcoming / Past) */}
            {activeTab !== 'pending' && (
                sessionsForTab.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <Calendar className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {activeTab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
                        </h3>
                        <p className="text-gray-500 max-w-sm">
                            {activeTab === 'upcoming'
                                ? 'Once you get matched with a mentor and schedule a session, it will appear here.'
                                : 'Your completed sessions will appear here with access to reports and feedback.'}
                        </p>
                            {activeTab === 'upcoming' && (
                            bookingReady ? (
                                <button
                                    onClick={tryOpenBookSession}
                                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                                >
                                    Book a Session
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : !canBook ? (
                                <Link
                                    href="/dashboard/student/profile"
                                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                                >
                                    Complete profile to book
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            ) : (
                                <p className="mt-6 text-sm text-gray-400 max-w-sm">
                                    Your mentor will be assigned by the Access Oxbridge team. You can book a session as soon as they are assigned.
                                </p>
                            )
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
                                        {/* Mentor Avatar */}
                                        <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center text-lg font-bold shrink-0">
                                            {session.mentor_full_name?.[0] || 'M'}
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                Session with {session.mentor_full_name}
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
                                                {session.zoom_join_url ? (
                                                    credits > 0 ? (
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
                                                        <button
                                                            type="button"
                                                            onClick={() => openCreditsRequest('booking')}
                                                            className="inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl bg-accent text-white hover:scale-[1.02] transition-all"
                                                        >
                                                            <Coins className="w-4 h-4" />
                                                            Request credits to join
                                                        </button>
                                                    )
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
                                                {session.recording_available && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setRecordingSessionId(session.id)}
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition-colors"
                                                    >
                                                        <PlayCircle className="w-4 h-4" />
                                                        Watch Recording
                                                    </button>
                                                )}
                                                {session.has_report && (
                                                    <Link
                                                        href={`/dashboard/student/sessions/${session.id}/report`}
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent/10 text-accent font-bold rounded-xl hover:bg-accent/20 transition-colors"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        View Report
                                                    </Link>
                                                )}
                                                {!session.has_feedback && (
                                                    <Link
                                                        href={`/dashboard/student/sessions/${session.id}/feedback`}
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-colors"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        Leave Feedback
                                                    </Link>
                                                )}
                                                {session.has_feedback && !session.has_report && (
                                                    <span className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium">
                                                        Report pending
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
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
                                <p className="text-sm text-gray-500 mt-1">Let us know if your mentor didn&apos;t show up.</p>
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
                                    Is the mentor absent?
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Only use this if your mentor hasn&apos;t joined the Zoom room after the scheduled start time.
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
                                        const res = await fetch('/api/student/report-mentor-absent', {
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
                                {reportSubmitting ? 'Submitting…' : 'Yes, mentor is absent'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {recordingSessionId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setRecordingSessionId(null)}
                    />
                    <div className="relative z-[61] w-full max-w-4xl mx-4 bg-black rounded-2xl shadow-2xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setRecordingSessionId(null)}
                            aria-label="Close recording"
                            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <video
                            key={recordingSessionId}
                            src={`/api/recording/${recordingSessionId}`}
                            controls
                            autoPlay
                            controlsList="nodownload"
                            className="w-full max-h-[80vh] bg-black"
                        >
                            Your browser does not support video playback.
                        </video>
                    </div>
                </div>
            )}
        </div>
    )
}
