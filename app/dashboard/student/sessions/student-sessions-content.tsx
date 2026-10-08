'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarBlank as Calendar, VideoCamera as Video, FileText, ChatCentered as MessageSquare, Clock, ArrowRight, Hourglass, Coins, XCircle, PlayCircle, X, CalendarDots as CalendarClock, CheckCircle } from '@phosphor-icons/react/ssr'
import { useStudentCredits } from '@/components/dashboard/student-credits-provider'
import { createClient } from '@/utils/supabase/client'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import { MentorSessionRequestCard } from './mentor-session-request-card'
import MentorAvatar from '@/components/dashboard/mentor-avatar'
import RescheduleSessionModal from '@/components/dashboard/reschedule-session-modal'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { segmentClass, segmentCount, segmentTrack } from '@/components/ui/segmented'
import { cn } from '@/utils/lib'
import { toast } from '@/components/ui/toaster'

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
    mentor_photo_url?: string | null
    initiated_by?: 'student' | 'mentor'
    proposed_start?: string | null
    proposed_end?: string | null
    proposed_slots?: { startTime: string; endTime: string | null }[]
    note?: string | null
    reschedule_of_session_id?: string | null
    original_scheduled_at?: string | null
}

interface StudentSessionsContentProps {
    sessions: Session[]
    pendingRequests: PendingRequest[]
    reschedulePendingSessionIds?: string[]
    credits: number
    canBook?: boolean
    hasMentors?: boolean
    autoOpenBooking?: boolean
    studentId: string
    timezone?: string | null
}

export default function StudentSessionsContent({
    sessions,
    pendingRequests,
    reschedulePendingSessionIds = [],
    credits,
    canBook = false,
    hasMentors = false,
    autoOpenBooking = false,
    studentId,
    timezone = null
}: StudentSessionsContentProps) {
    const router = useRouter()
    // Booking is only possible once the profile is complete AND an admin has
    // assigned at least one mentor to this student.
    const bookingReady = canBook && hasMentors
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
    const [rescheduleSession, setRescheduleSession] = useState<Session | null>(null)

    const pendingRescheduleSet = useMemo(
        () => new Set(reschedulePendingSessionIds),
        [reschedulePendingSessionIds]
    )

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
            toast.error(e instanceof Error ? e.message : 'Failed to cancel pending requests')
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
        <div className="space-y-6">
            {showReportSuccess && (
                <div role="status" className="flex items-center justify-between gap-3 rounded-card bg-tint-green px-4 py-3 text-sm text-tint-green-foreground">
                    <span className="inline-flex items-center gap-2 font-medium"><CheckCircle weight="fill" className="size-5" /> Report submitted.</span>
                    <button
                        type="button"
                        onClick={() => setShowReportSuccess(false)}
                        className="rounded-full px-2 py-1 text-sm font-medium transition-colors duration-150 hover:bg-white/60"
                    >
                        Dismiss
                    </button>
                </div>
            )}
            {/* Credit Status Banner */}
            {credits === 0 && (pendingRequests.length > 0 || upcomingSessions.length > 0) && (
                <div className="flex flex-col items-start justify-between gap-4 rounded-card bg-tint-amber p-5 ring-1 ring-tint-amber-foreground/15 md:flex-row md:items-center">
                    <div className="flex items-start gap-3.5">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-tint-amber-foreground">
                            <Clock weight="duotone" className="size-6" />
                        </span>
                        <div>
                            <h3 className="text-base font-semibold text-foreground">
                                Ready to start your sessions?
                            </h3>
                            <p className="mt-0.5 text-sm text-tint-amber-foreground text-pretty">
                                You have {pendingRequests.length + upcomingSessions.length} mentorship request(s) waiting. Add credits now to ensure your sessions are confirmed.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => openCreditsRequest('topup')}
                        className={cn(buttonVariants(), 'w-full whitespace-nowrap md:w-auto')}
                    >
                        Request credits
                    </button>
                </div>
            )}
            {/* Tab Switcher + Cancel all (pending only) */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                <div className={segmentTrack}>
                    <button
                        onClick={() => setActiveTab('pending')}
                        aria-pressed={activeTab === 'pending'}
                        className={segmentClass(activeTab === 'pending')}
                    >
                        Pending
                        {pendingRequests.length > 0 && (
                            <span className={cn(segmentCount, 'bg-tint-amber text-tint-amber-foreground')}>
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        aria-pressed={activeTab === 'upcoming'}
                        className={segmentClass(activeTab === 'upcoming')}
                    >
                        Upcoming
                        {upcomingSessions.length > 0 && (
                            <span className={cn(segmentCount, 'bg-tint-blue text-tint-blue-foreground')}>
                                {upcomingSessions.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('current')}
                        aria-pressed={activeTab === 'current'}
                        className={segmentClass(activeTab === 'current')}
                    >
                        Current
                        {currentSessions.length > 0 && (
                            <span className={cn(segmentCount, 'bg-tint-green text-tint-green-foreground')}>
                                {currentSessions.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        aria-pressed={activeTab === 'past'}
                        className={segmentClass(activeTab === 'past')}
                    >
                        Past
                        {pastSessions.length > 0 && (
                            <span className={cn(segmentCount, 'bg-card text-muted-foreground')}>
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
                        className={buttonVariants({ variant: 'destructive-ghost' })}
                    >
                        <XCircle className="size-4 shrink-0" />
                        {cancelling ? 'Cancelling…' : 'Cancel my pending requests'}
                    </button>
                )}
            </div>

            {/* Pending Requests Tab */}
            {activeTab === 'pending' && (
                pendingRequests.length === 0 ? (
                    <EmptyState
                        icon={Hourglass}
                        title="No pending requests"
                        description="When you request a session with your mentor, it will appear here until they confirm a time."
                        className="py-16"
                        action={bookingReady ? (
                            <button
                                onClick={tryOpenBookSession}
                                className={buttonVariants()}
                            >
                                Book a session
                                <ArrowRight weight="bold" />
                            </button>
                        ) : !canBook ? (
                            <Link
                                href="/dashboard/student/profile"
                                className={buttonVariants()}
                            >
                                Complete profile to book
                                <ArrowRight weight="bold" />
                            </Link>
                        ) : (
                            <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                                Your mentor will be assigned by the Access Oxbridge team. You can book a session as soon as they are assigned.
                            </p>
                        )}
                    />
                ) : (
                    <div className="grid gap-3">
                        {pendingRequests.map((request) => (
                            request.initiated_by === 'mentor' ? (
                                <MentorSessionRequestCard
                                    key={request.id}
                                    request={{
                                        id: request.id,
                                        mentor_full_name: request.mentor_full_name,
                                        mentor_photo_url: request.mentor_photo_url ?? null,
                                        proposed_start: request.proposed_start ?? null,
                                        note: request.note ?? null,
                                        is_reschedule: !!request.reschedule_of_session_id,
                                        original_scheduled_at: request.original_scheduled_at ?? null,
                                    }}
                                    timezone={timezone}
                                />
                            ) : (
                                <div
                                    key={request.id}
                                    className={sessionCard}
                                >
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            <MentorAvatar
                                                name={request.mentor_full_name}
                                                photoUrl={request.mentor_photo_url}
                                                fallbackClassName="bg-tint-amber text-tint-amber-foreground"
                                            />
                                            <div className="min-w-0">
                                                <h3 className="text-base font-semibold text-foreground text-pretty">
                                                    {request.reschedule_of_session_id
                                                        ? `Reschedule pending with ${request.mentor_full_name}`
                                                        : `Request sent to ${request.mentor_full_name}`}
                                                </h3>
                                                <div className="mt-1 space-y-1">
                                                    {(request.proposed_slots && request.proposed_slots.length > 0
                                                        ? request.proposed_slots
                                                        : request.proposed_start
                                                            ? [{ startTime: request.proposed_start, endTime: request.proposed_end ?? null }]
                                                            : []
                                                    ).map((slot) => (
                                                        <div
                                                            key={`${slot.startTime}-${slot.endTime || ''}`}
                                                            className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums"
                                                        >
                                                            <Calendar className="size-4 shrink-0" />
                                                            <span>
                                                                {`${formatDate(slot.startTime)} at ${formatTime(slot.startTime)}`}
                                                                {slot.endTime ? ` – ${formatTime(slot.endTime)}` : ''}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {!(request.proposed_slots?.length || request.proposed_start) && (
                                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                                                            <Calendar className="size-4 shrink-0" />
                                                            <span>{formatDate(request.created_at)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {request.reschedule_of_session_id && request.original_scheduled_at && (
                                                    <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                                                        Current session: {formatDate(request.original_scheduled_at)} at {formatTime(request.original_scheduled_at)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge tone="amber" size="lg" className="self-start">
                                            <Hourglass weight="fill" />
                                            Awaiting response
                                        </Badge>
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
                    <EmptyState
                        icon={Calendar}
                        title={activeTab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
                        description={activeTab === 'upcoming'
                            ? 'Once you get matched with a mentor and schedule a session, it will appear here.'
                            : 'Your completed sessions will appear here with access to reports and feedback.'}
                        className="py-16"
                        action={activeTab === 'upcoming' && (
                            bookingReady ? (
                                <button
                                    onClick={tryOpenBookSession}
                                    className={buttonVariants()}
                                >
                                    Book a session
                                    <ArrowRight weight="bold" />
                                </button>
                            ) : !canBook ? (
                                <Link
                                    href="/dashboard/student/profile"
                                    className={buttonVariants()}
                                >
                                    Complete profile to book
                                    <ArrowRight weight="bold" />
                                </Link>
                            ) : (
                                <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                                    Your mentor will be assigned by the Access Oxbridge team. You can book a session as soon as they are assigned.
                                </p>
                            )
                        )}
                    />
                ) : (
                    <div className="grid gap-3">
                        {sessionsForTab.map((session) => (
                            <div
                                key={session.id}
                                className={sessionCard}
                            >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex items-start gap-3.5">
                                        <MentorAvatar
                                            name={session.mentor_full_name}
                                            photoUrl={session.mentor_photo_url}
                                        />

                                        <div className="min-w-0">
                                            <h3 className="text-base font-semibold text-foreground">
                                                Session with {session.mentor_full_name}
                                            </h3>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground tabular-nums">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="size-4" />
                                                    {formatDate(session.scheduled_at)}
                                                </span>
                                                {session.scheduled_at && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="size-4" />
                                                        {formatTime(session.scheduled_at)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status Badge */}
                                            {activeTab === 'upcoming' && isSessionSoon(session.scheduled_at) && (
                                                <Badge tone="green" className="mt-2.5">
                                                    <span className="relative flex size-2">
                                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60 motion-reduce:animate-none" />
                                                        <span className="relative inline-flex size-2 rounded-full bg-success" />
                                                    </span>
                                                    Starting soon
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-wrap md:justify-end">
                                        {activeTab === 'upcoming' || activeTab === 'current' ? (
                                            <>
                                                {session.zoom_join_url ? (
                                                    credits > 0 ? (
                                                        <a
                                                            href={session.zoom_join_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn(buttonVariants(), isSessionSoon(session.scheduled_at) && 'bg-success hover:bg-success/90')}
                                                        >
                                                            <Video weight="fill" />
                                                            Join session
                                                        </a>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => openCreditsRequest('booking')}
                                                            className={buttonVariants()}
                                                        >
                                                            <Coins />
                                                            Request credits to join
                                                        </button>
                                                    )
                                                ) : (
                                                    <span className={mutedPill}>
                                                        Zoom link coming soon
                                                    </span>
                                                )}
                                                {activeTab === 'upcoming' && !pendingRescheduleSet.has(session.id) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setRescheduleSession(session)}
                                                        className={buttonVariants({ variant: 'outline' })}
                                                    >
                                                        <CalendarClock />
                                                        Reschedule
                                                    </button>
                                                )}
                                                {activeTab === 'current' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReportSessionId(session.id)}
                                                        className={buttonVariants({ variant: 'destructive-ghost' })}
                                                    >
                                                        <MessageSquare />
                                                        Report
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {session.recording_available && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setRecordingSessionId(session.id)}
                                                        className={buttonVariants({ variant: 'secondary' })}
                                                    >
                                                        <PlayCircle weight="fill" className="text-tint-violet-foreground" />
                                                        Watch recording
                                                    </button>
                                                )}
                                                {session.has_report && (
                                                    <Link
                                                        href={`/dashboard/student/sessions/${session.id}/report`}
                                                        className={buttonVariants({ variant: 'outline' })}
                                                    >
                                                        <FileText />
                                                        View report
                                                    </Link>
                                                )}
                                                {!session.has_feedback && (
                                                    <Link
                                                        href={`/dashboard/student/sessions/${session.id}/feedback`}
                                                        className={cn(buttonVariants({ variant: 'secondary' }), 'bg-tint-amber text-tint-amber-foreground hover:bg-tint-amber/70')}
                                                    >
                                                        <MessageSquare />
                                                        Leave feedback
                                                    </Link>
                                                )}
                                                {session.has_feedback && !session.has_report && (
                                                    <span className={mutedPill}>
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

            {/* Closing by backdrop, Escape or the X all clear the report and its error, as the backdrop did. */}
            <Dialog open={!!reportSessionId} onOpenChange={(open) => { if (!open) { setReportSessionId(null); setReportError(null) } }}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Report a problem</DialogTitle>
                        <DialogDescription>Let us know if your mentor didn&apos;t show up.</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-4">
                        <div className="rounded-card bg-tint-rose p-4">
                            <p className="text-sm font-medium text-foreground">
                                Is the mentor absent?
                            </p>
                            <p className="mt-1 text-sm text-tint-rose-foreground text-pretty">
                                Only use this if your mentor hasn&apos;t joined the Zoom room after the scheduled start time.
                            </p>
                        </div>
                        {reportError && (
                            <p role="alert" className="text-sm text-destructive">{reportError}</p>
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
                            className={cn(buttonVariants({ variant: 'destructive' }), 'w-full')}
                        >
                            {reportSubmitting ? 'Submitting…' : 'Yes, mentor is absent'}
                        </button>
                    </DialogBody>
                </DialogContent>
            </Dialog>

            {recordingSessionId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setRecordingSessionId(null)}
                    />
                    <div className="relative z-[61] mx-4 w-full max-w-4xl overflow-hidden rounded-card bg-black shadow-overlay">
                        <button
                            type="button"
                            onClick={() => setRecordingSessionId(null)}
                            aria-label="Close recording"
                            className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-[background-color,scale] duration-150 ease-out hover:bg-white/20 active:scale-[0.96]"
                        >
                            <X className="size-5" />
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

            <RescheduleSessionModal
                isOpen={!!rescheduleSession}
                onClose={() => setRescheduleSession(null)}
                sessionId={rescheduleSession?.id || ''}
                counterpartName={rescheduleSession?.mentor_full_name || 'your mentor'}
                currentScheduledAt={rescheduleSession?.scheduled_at ?? null}
                timezone={timezone}
            />
        </div>
    )
}

const sessionCard = 'rounded-card bg-card p-5 shadow-border transition-shadow duration-150 ease-out hover:shadow-border-hover sm:p-6'
const mutedPill = 'inline-flex h-11 items-center rounded-full bg-muted px-4 text-sm text-muted-foreground'
