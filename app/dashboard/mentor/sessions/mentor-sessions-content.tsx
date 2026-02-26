'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Video, FileText, Clock, ArrowRight, Users } from 'lucide-react'

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
    upcomingSessions: Session[]
    pastSessions: Session[]
}

export default function MentorSessionsContent({
    upcomingSessions,
    pastSessions
}: MentorSessionsContentProps) {
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

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

    const sessions = activeTab === 'upcoming' ? upcomingSessions : pastSessions

    return (
        <div className="space-y-8">
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
            {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <Calendar className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {activeTab === 'upcoming' && 'No upcoming sessions'}
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
                    {sessions.map((session) => (
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
                                    {activeTab === 'upcoming' ? (
                                        session.zoom_start_url ? (
                                            <a
                                                href={session.zoom_start_url}
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
                                        )
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
        </div>
    )
}
