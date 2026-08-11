'use client'

import Link from 'next/link'
import { Calendar, Clock, Video, ArrowRight } from 'lucide-react'
import AcademicProfileCard from '@/components/dashboard/academic-profile-card'
import WeeklyCalendar from '@/components/dashboard/weekly-calendar'
import ApplicationTimeline from '@/components/dashboard/application-timeline'
import { useStudentCredits } from '@/components/dashboard/student-credits-provider'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'

interface UpcomingSession {
    id: string
    scheduled_at: string
    zoom_join_url: string | null
    mentor_full_name: string
}

interface AcademicProfile {
    target_university: string | null
    target_course: string | null
    application_year: number | null
    subjects: { name: string; predicted_grade: string }[] | null
    school_name: string | null
    school_country: string | null
    curriculum: string | null
    curriculum_other: string | null
    timezone: string | null
    interests: string | null
    extracurriculars: string | null
    additional_notes: string | null
    is_complete: boolean | null
}

interface StudentDashboardContentProps {
    profile: any
    activeSession: any
    pendingRequests: any[]
    upcomingSessions: UpcomingSession[]
    academicProfile: AcademicProfile | null
    hasMentors?: boolean
    userId: string
    userName: string
    greetingName: string
    sessionsThisWeek?: number
    timezone?: string | null
}

export default function StudentDashboardContent({
    profile,
    activeSession,
    pendingRequests,
    upcomingSessions,
    academicProfile,
    hasMentors = false,
    userId,
    userName,
    greetingName,
    sessionsThisWeek = 0,
    timezone = null
}: StudentDashboardContentProps) {
    const formatDate = (dateString: string) =>
        formatDateInTz(dateString, timezone, { weekday: 'short', day: 'numeric', month: 'short' })

    const formatTime = (dateString: string) => formatTimeInTz(dateString, timezone)

    const isSessionSoon = (dateString: string) => {
        const sessionTime = new Date(dateString).getTime()
        const now = Date.now()
        const oneHour = 60 * 60 * 1000
        return sessionTime - now <= oneHour && sessionTime > now
    }

    const { tryOpenBookSession } = useStudentCredits()

    // Check if profile is complete enough for booking
    const profileComplete = academicProfile?.is_complete &&
        academicProfile?.school_name &&
        academicProfile?.timezone &&
        academicProfile?.subjects &&
        academicProfile.subjects.length > 0

    // Booking also requires at least one admin-assigned mentor.
    const canBook = !!profileComplete && hasMentors

    return (
        <>
            <div className="space-y-10">
                {/* Top row: heading + welcome aligned with hours remaining & bell (same vertical level) */}
                <div className="flex flex-wrap items-center justify-between gap-4 -mt-1 md:-mt-5">
                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-accent tracking-tight">
                            Student Dashboard
                        </h1>
                        <p className="mt-4 text-gray-500 text-xl font-medium">Welcome back, {greetingName}!</p>
                    </div>
                    {/* Spacer so fixed hours/bell sit on the right without overlapping this row */}
                    <div className="w-0 md:w-[280px] shrink-0" aria-hidden="true" />
                </div>

                <header className="mb-12 flex flex-col md:flex-row md:items-start justify-between gap-6 mt-6">
                    <div className="flex-1 min-w-0">
                        {/* Academic Profile + Targets on left */}
                        <div className="space-y-4">
                            <AcademicProfileCard userId={userId} userName={userName} />

                            {/* Targets Section */}
                            {academicProfile && (academicProfile.target_university || academicProfile.target_course) && (
                                <div className="flex flex-wrap items-center gap-3">
                                    {academicProfile.target_university && (
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-semibold">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            {academicProfile.target_university}
                                        </span>
                                    )}
                                    {academicProfile.target_course && (
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-semibold">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            {academicProfile.target_course}
                                        </span>
                                    )}
                                    {academicProfile.application_year && (
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-semibold">
                                            <Calendar className="w-4 h-4" />
                                            {academicProfile.application_year} Entry
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-full md:w-[360px] shrink-0">
                        {activeSession ? (
                            <div className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-lg shadow-gray-200/50 w-full">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-gray-900 truncate">Active Mentorship</h3>
                                        <p className="text-sm text-gray-500 mt-0.5 truncate">Mentor: <strong>{activeSession.mentor_full_name}</strong></p>
                                    </div>
                                </div>
                                {activeSession.scheduled_at && (
                                    <p className="text-accent font-bold text-sm mt-4">
                                        {formatDate(activeSession.scheduled_at)} · {formatTime(activeSession.scheduled_at)}
                                    </p>
                                )}
                            </div>
                        ) : pendingRequests.length > 0 ? (
                            <div className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-lg shadow-gray-200/50 w-full flex flex-col">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-gray-900 truncate">Request Pending</h3>
                                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">We've sent your request to your mentor. We'll notify you once they confirm a time!</p>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <Link
                                        href="/dashboard/student/sessions"
                                        className="block w-full py-3 bg-accent text-white font-bold text-[18px] rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all text-center mb-3"
                                    >
                                        View Pending Requests
                                    </Link>
                                    {canBook ? (
                                        <button
                                            onClick={tryOpenBookSession}
                                            className="block w-full py-3 text-accent font-semibold text-[16px] text-center border-2 border-accent/20 rounded-2xl hover:bg-accent/5 transition-colors"
                                        >
                                            + Book Another Session
                                        </button>
                                    ) : !profileComplete ? (
                                        <Link
                                            href="/dashboard/student/profile"
                                            className="block w-full py-3 text-amber-600 font-semibold text-[16px] text-center border-2 border-amber-200 rounded-2xl hover:bg-amber-50 transition-colors"
                                        >
                                            Complete Profile to Book
                                        </Link>
                                    ) : (
                                        <p className="block w-full py-3 text-gray-400 text-[14px] text-center">
                                            Your mentor will be assigned by the team soon.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-accent rounded-[32px] shadow-2xl shadow-accent/30 w-full space-y-6">
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                                        This Week
                                    </p>
                                    <div className="flex items-baseline gap-2.5 flex-wrap">
                                        <span className="text-6xl font-extrabold text-white leading-none tabular-nums">
                                            {sessionsThisWeek}
                                        </span>
                                        <span className="text-white/80 font-medium text-base">
                                            {sessionsThisWeek === 1 ? 'session booked' : 'sessions booked'}
                                        </span>
                                    </div>
                                </div>

                                {canBook ? (
                                    <button
                                        type="button"
                                        onClick={tryOpenBookSession}
                                        className="flex w-full items-center justify-center bg-rich-amber-accent text-accent font-bold py-3.5 px-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10"
                                    >
                                        Book a Session
                                    </button>
                                ) : !profileComplete ? (
                                    <Link
                                        href="/dashboard/student/profile"
                                        className="flex w-full items-center justify-center bg-rich-amber-accent text-accent font-bold py-3.5 px-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10"
                                    >
                                        Complete Profile
                                    </Link>
                                ) : (
                                    <span className="flex w-full items-center justify-center bg-white/10 text-white/80 font-semibold py-3.5 px-6 rounded-2xl text-sm">
                                        Mentor assignment pending
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* Application Timeline */}
                <ApplicationTimeline applicationYear={academicProfile?.application_year} />

                {/* Weekly Calendar */}
                <div className="mb-10">
                    <WeeklyCalendar
                        sessions={upcomingSessions.map(s => ({
                            id: s.id,
                            scheduled_at: s.scheduled_at,
                            zoom_url: s.zoom_join_url,
                            person_name: s.mentor_full_name
                        }))}
                        personLabel="Mentor"
                        credits={profile?.credits || 0}
                        timezone={timezone}
                    />
                </div>

                {/* Learning Resources — hidden from student home view
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className={`p-8 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-indigo-100 transition-all group ${upcomingSessions.length === 0 ? 'lg:col-span-2' : ''}`}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Resources</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: 'Oxbridge Strategy', slug: 'oxbridge-admissions' },
                                { label: 'Personal Statement Guide', slug: 'personal-statement' },
                                { label: 'Interview Mastery', slug: 'interview-tips' },
                                { label: 'Subject Deep Dives', slug: 'uk-universities' },
                            ].map(({ label, slug }) => (
                                <Link key={slug} href={`/dashboard/student/resources?category=${slug}`} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-accent/30 transition-colors flex items-center justify-between group/item">
                                    <span className="font-semibold text-gray-700">{label}</span>
                                    <svg className="w-5 h-5 text-gray-300 group-hover/item:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
                */}
            </div>
        </>
    )
}
