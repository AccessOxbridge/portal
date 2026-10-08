'use client'

import Link from 'next/link'
import { CalendarBlank as Calendar, Clock, VideoCamera as Video, ArrowRight, Buildings, BookOpen, CheckCircle, Hourglass, Plus } from '@phosphor-icons/react/ssr'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/lib'
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
    entrance_exam_date: string | null
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

    // The three target chips share one quiet style.
    const chip = 'inline-flex items-center gap-1.5 rounded-full bg-tint-blue px-3 py-1.5 text-sm font-medium text-tint-blue-foreground [&_svg]:size-4'

    return (
        <>
            <div className="space-y-8 md:space-y-10">
                {/* Top row: heading + welcome aligned with hours remaining & bell (same vertical level) */}
                <div className="flex flex-wrap items-center justify-between gap-4 -mt-1 md:-mt-5">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                            Student dashboard
                        </h1>
                        <p className="mt-2 text-lg text-muted-foreground">Welcome back, {greetingName}!</p>
                    </div>
                    {/* Spacer so fixed hours/bell sit on the right without overlapping this row */}
                    <div className="w-0 md:w-[280px] shrink-0" aria-hidden="true" />
                </div>

                <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                        {/* Academic Profile + Targets on left */}
                        <div className="space-y-4">
                            <AcademicProfileCard userId={userId} userName={userName} />

                            {/* Targets Section */}
                            {academicProfile && (academicProfile.target_university || academicProfile.target_course) && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {academicProfile.target_university && (
                                        <span className={chip}>
                                            <Buildings weight="duotone" />
                                            {academicProfile.target_university}
                                        </span>
                                    )}
                                    {academicProfile.target_course && (
                                        <span className={chip}>
                                            <BookOpen weight="duotone" />
                                            {academicProfile.target_course}
                                        </span>
                                    )}
                                    {academicProfile.application_year && (
                                        <span className={chip}>
                                            <Calendar weight="duotone" />
                                            {academicProfile.application_year} entry
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* On phones the "what's next" card comes first. */}
                    <div className="order-first w-full shrink-0 md:order-none md:w-[360px]">
                        {activeSession ? (
                            <Card className="w-full p-5 sm:p-6">
                                <div className="flex items-start gap-3.5">
                                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                                        <CheckCircle weight="duotone" className="size-6" />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="truncate text-base font-semibold text-foreground">Active mentorship</h3>
                                        <p className="mt-0.5 truncate text-sm text-muted-foreground">Mentor: <strong className="font-medium text-foreground">{activeSession.mentor_full_name}</strong></p>
                                    </div>
                                </div>
                                {activeSession.scheduled_at && (
                                    <p className="mt-4 text-sm font-medium tabular-nums text-brand">
                                        {formatDate(activeSession.scheduled_at)} · {formatTime(activeSession.scheduled_at)}
                                    </p>
                                )}
                            </Card>
                        ) : pendingRequests.length > 0 ? (
                            <Card className="flex w-full flex-col p-5 sm:p-6">
                                <div className="flex items-start gap-3.5">
                                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-tint-amber text-tint-amber-foreground">
                                        <Hourglass weight="duotone" className="size-6" />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="truncate text-base font-semibold text-foreground">Request pending</h3>
                                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">We've sent your request to your mentor. We'll let you know once they confirm a time.</p>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-2">
                                    <Link
                                        href="/dashboard/student/sessions"
                                        className={cn(buttonVariants(), 'w-full')}
                                    >
                                        View pending requests
                                    </Link>
                                    {canBook ? (
                                        <button
                                            onClick={tryOpenBookSession}
                                            className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                                        >
                                            <Plus weight="bold" />
                                            Book another session
                                        </button>
                                    ) : !profileComplete ? (
                                        <Link
                                            href="/dashboard/student/profile"
                                            className={cn(buttonVariants({ variant: 'outline' }), 'w-full text-tint-amber-foreground')}
                                        >
                                            Complete profile to book
                                        </Link>
                                    ) : (
                                        <p className="py-2 text-center text-sm text-muted-foreground">
                                            Your mentor will be assigned by the team soon.
                                        </p>
                                    )}
                                </div>
                            </Card>
                        ) : (
                            // The one warm, navy card on the page: what's next, and the main action.
                            <div className="w-full space-y-6 rounded-card bg-primary p-5 text-primary-foreground shadow-overlay sm:p-6">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-primary-foreground/70">
                                        This week
                                    </p>
                                    <div className="flex items-baseline gap-2.5 flex-wrap">
                                        <span className="text-5xl font-semibold leading-none tracking-tight tabular-nums">
                                            {sessionsThisWeek}
                                        </span>
                                        <span className="text-base text-primary-foreground/80">
                                            {sessionsThisWeek === 1 ? 'session booked' : 'sessions booked'}
                                        </span>
                                    </div>
                                </div>

                                {canBook ? (
                                    <button
                                        type="button"
                                        onClick={tryOpenBookSession}
                                        className={cn(buttonVariants(), 'w-full bg-rich-amber-accent text-legacy-accent hover:bg-rich-amber-accent/90')}
                                    >
                                        Book a session
                                    </button>
                                ) : !profileComplete ? (
                                    <Link
                                        href="/dashboard/student/profile"
                                        className={cn(buttonVariants(), 'w-full bg-rich-amber-accent text-legacy-accent hover:bg-rich-amber-accent/90')}
                                    >
                                        Complete profile
                                    </Link>
                                ) : (
                                    <span className="flex h-11 w-full items-center justify-center rounded-full bg-white/10 px-6 text-sm font-medium text-primary-foreground/80">
                                        Mentor assignment pending
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* Application Timeline */}
                <ApplicationTimeline
                    applicationYear={academicProfile?.application_year}
                    entranceExamDate={academicProfile?.entrance_exam_date}
                />

                {/* Weekly Calendar */}
                <div>
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
                                <Link key={slug} href={`/dashboard/student/resources?category=${slug}`} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-legacy-accent/30 transition-colors flex items-center justify-between group/item">
                                    <span className="font-semibold text-gray-700">{label}</span>
                                    <svg className="w-5 h-5 text-gray-300 group-hover/item:text-legacy-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
