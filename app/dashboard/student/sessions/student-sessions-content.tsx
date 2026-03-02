'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Video, FileText, MessageSquare, Clock, ArrowRight, Hourglass, Coins, XCircle } from 'lucide-react'
import BookSessionModal from '@/components/dashboard/book-session-modal'

interface Session {
    id: string
    scheduled_at: string | null
    status: string
    zoom_join_url: string | null
    zoom_meeting_status: string | null
    mentor_full_name: string
    mentor_photo_url: string | null
    has_feedback: boolean
    has_report: boolean
}

interface PendingRequest {
    id: string
    created_at: string
    mentor_full_name: string
}

interface AcademicProfileForBooking {
    school_name: string | null
    school_country: string | null
    curriculum: string | null
    curriculum_other?: string | null
    subjects: { name: string; predicted_grade: string }[] | null
    target_university: string | null
    timezone: string | null
    interests: string | null
    extracurriculars: string | null
    additional_notes?: string | null
}

interface StudentSessionsContentProps {
    upcomingSessions: Session[]
    pastSessions: Session[]
    pendingRequests: PendingRequest[]
    credits: number
    academicProfile?: AcademicProfileForBooking | null
    canBook?: boolean
    autoOpenBooking?: boolean
}

export default function StudentSessionsContent({
    upcomingSessions,
    pastSessions,
    pendingRequests,
    credits,
    academicProfile,
    canBook = false,
    autoOpenBooking = false
}: StudentSessionsContentProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'past'>(
        pendingRequests.length > 0 ? 'pending' : 'upcoming'
    )
    const [showBookingModal, setShowBookingModal] = useState(autoOpenBooking && canBook)
    const [cancelling, setCancelling] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const handler = () => {
            if (canBook) {
                setShowBookingModal(true)
            }
        }
        window.addEventListener('open-book-session', handler as EventListener)
        return () => {
            window.removeEventListener('open-book-session', handler as EventListener)
        }
    }, [canBook])

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
        const now = Date.now()
        const oneHour = 60 * 60 * 1000
        return sessionTime - now <= oneHour && sessionTime > now
    }

    const handleCancelAllPending = async () => {
        if (cancelling || pendingRequests.length === 0) return
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

    const sessions = activeTab === 'upcoming' ? upcomingSessions : pastSessions

    return (
        <div className="space-y-8">
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
                    <Link
                        href="/dashboard/student/services"
                        className="px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-accent/20 whitespace-nowrap"
                    >
                        Top up Credits
                    </Link>
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
                {activeTab === 'pending' && pendingRequests.length > 0 && (
                    <button
                        type="button"
                        onClick={handleCancelAllPending}
                        disabled={cancelling}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <XCircle className="w-4 h-4 shrink-0" />
                        {cancelling ? 'Cancelling…' : 'Cancel all pending requests'}
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
                            When you request mentorship, your requests will appear here until a mentor accepts.
                        </p>
                        {canBook ? (
                            <button
                                onClick={() => setShowBookingModal(true)}
                                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                            >
                                Book a Session
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <Link
                                href="/dashboard/student/profile"
                                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                            >
                                Complete profile to book
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingRequests.map((request) => (
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
                        ))}
                    </div>
                )
            )}

            {/* Sessions List (Upcoming / Past) */}
            {activeTab !== 'pending' && (
                sessions.length === 0 ? (
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
                            canBook ? (
                                <button
                                    onClick={() => setShowBookingModal(true)}
                                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                                >
                                    Find a Mentor
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <Link
                                    href="/dashboard/student/profile"
                                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                                >
                                    Complete profile to book
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            )
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {sessions.map((session) => (
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
                                        {activeTab === 'upcoming' ? (
                                            session.zoom_join_url ? (
                                                <a
                                                    href={credits > 0 ? session.zoom_join_url : '/dashboard/student/services'}
                                                    target={credits > 0 ? "_blank" : undefined}
                                                    rel={credits > 0 ? "noopener noreferrer" : undefined}
                                                    className={`inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all ${isSessionSoon(session.scheduled_at)
                                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200'
                                                        : 'bg-accent text-white hover:scale-[1.02]'
                                                        }`}
                                                >
                                                    {credits > 0 ? <Video className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                                                    {credits > 0 ? 'Join Session' : 'Top up Credits to Join'}
                                                </a>
                                            ) : (
                                                <span className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium">
                                                    Zoom link coming soon
                                                </span>
                                            )
                                        ) : (
                                            <div className="flex items-center gap-2">
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

            {academicProfile && canBook && (
                <BookSessionModal
                    isOpen={showBookingModal}
                    onClose={() => setShowBookingModal(false)}
                    studentProfile={{
                        school_name: academicProfile.school_name || '',
                        school_country: academicProfile.school_country || '',
                        curriculum: academicProfile.curriculum || '',
                        curriculum_other: academicProfile.curriculum_other || undefined,
                        subjects: academicProfile.subjects || [],
                        target_university: academicProfile.target_university || '',
                        timezone: academicProfile.timezone || '',
                        interests: academicProfile.interests || '',
                        extracurriculars: academicProfile.extracurriculars || '',
                        additional_notes: academicProfile.additional_notes || undefined
                    }}
                />
            )}
        </div>
    )
}
