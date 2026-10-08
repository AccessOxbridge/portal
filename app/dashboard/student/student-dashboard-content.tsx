'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { CalendarBlank as Calendar, VideoCamera as Video, Buildings, BookOpen, Hourglass, Plus } from '@phosphor-icons/react/ssr'
import { Avatar } from '@/components/ui/avatar'
import { ProgressRing } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/lib'
import AcademicProfileCard from '@/components/dashboard/academic-profile-card'
import WeeklyCalendar from '@/components/dashboard/weekly-calendar'
import ApplicationTimeline from '@/components/dashboard/application-timeline'
import { useStudentCredits } from '@/components/dashboard/student-credits-provider'
import { formatDateInTz, formatTimeInTz, getZonedNow, resolveTz } from '@/lib/timezone'

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
    const formatTime = (dateString: string) => formatTimeInTz(dateString, timezone)

    // The time the card's state is judged against; moved on by one timer below.
    const [now, setNow] = useState(() => Date.now())

    const isSessionSoon = (dateString: string) => {
        const sessionTime = new Date(dateString).getTime()
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

    const credits: number = profile?.credits || 0
    const nextAt: string | null = activeSession?.scheduled_at ?? null
    const nextZoomUrl: string | null =
        activeSession?.zoom_join_url ?? upcomingSessions.find((s) => s.id === activeSession?.id)?.zoom_join_url ?? null
    const startingSoon = !!nextAt && isSessionSoon(nextAt)

    // Re-render once, at the moment the next session enters its final hour,
    // so a page left open flips to "Join session" without a reload. A single
    // timer, not polling; nothing is fetched.
    useEffect(() => {
        if (!nextAt) return
        const flipAt = new Date(nextAt).getTime() - 60 * 60 * 1000
        const wait = flipAt - Date.now()
        if (wait <= 0 || wait > 2 ** 31 - 1) return
        const timer = setTimeout(() => setNow(Date.now()), wait + 500)
        return () => clearTimeout(timer)
    }, [nextAt])

    // The three target chips share one quiet style.
    const chip = 'inline-flex items-center gap-1.5 rounded-full bg-tint-blue px-3 py-1.5 text-sm font-medium text-tint-blue-foreground [&_svg]:size-4'
    const firstName = greetingName.trim().split(/\s+/)[0] || greetingName

    // Whatever is "up next" sits in one warm card: the next session, a pending
    // request, or the step that unlocks booking. Same states and buttons as
    // before, one place for them.
    const bookButton = (label: string) =>
        canBook ? (
            <button type="button" onClick={tryOpenBookSession} className={buttonVariants()}>
                <Plus weight="bold" />
                {label}
            </button>
        ) : !profileComplete ? (
            <Link href="/dashboard/student/profile" className={buttonVariants()}>
                Complete profile
            </Link>
        ) : (
            <span className="inline-flex h-11 items-center rounded-full bg-card/70 px-4 text-sm text-tint-amber-foreground">
                Mentor assignment pending
            </span>
        )

    return (
        <>
            <div className="space-y-6 md:space-y-8">
                {/* Top row: greeting aligned with hours remaining & bell (same vertical level) */}
                <Rise i={0} className="flex flex-wrap items-center justify-between gap-4 -mt-1 md:-mt-5">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
                        <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                            Hi {firstName}
                        </h1>
                        {academicProfile && (academicProfile.target_university || academicProfile.target_course) && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    {/* Spacer so fixed hours/bell sit on the right without overlapping this row */}
                    <div className="w-0 md:w-[280px] shrink-0" aria-hidden="true" />
                </Rise>

                <div className="grid gap-4 md:grid-cols-3">
                    <Rise i={1} className="md:col-span-2 md:row-span-2">
                        <div
                            className={cn(
                                'flex h-full flex-col gap-5 rounded-card p-6 ring-1 transition-colors duration-300 sm:flex-row sm:items-center sm:gap-6 sm:p-7',
                                startingSoon ? 'bg-tint-green ring-success/30' : 'bg-tint-amber ring-warning/30',
                            )}
                        >
                            {activeSession ? (
                                <>
                                    <Avatar name={activeSession.mentor_full_name || 'Mentor'} size="xl" className="size-20 shrink-0 text-2xl ring-4 ring-card" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className={cn('text-sm font-medium', startingSoon ? 'text-tint-green-foreground' : 'text-tint-amber-foreground')}>
                                                {startingSoon ? 'Starting soon' : 'Up next'}
                                            </p>
                                            {nextAt && !startingSoon && (
                                                <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-tint-amber-foreground">
                                                    {relativeDay(nextAt, timezone)}
                                                </span>
                                            )}
                                            {startingSoon && (
                                                <span className="relative flex size-2">
                                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60 motion-reduce:animate-none" />
                                                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                                                </span>
                                            )}
                                        </div>
                                        {nextAt ? (
                                            <>
                                                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground text-balance">
                                                    {formatDateInTz(nextAt, timezone, { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </p>
                                                <p className={cn('mt-1 text-lg tabular-nums', startingSoon ? 'text-tint-green-foreground' : 'text-tint-amber-foreground')}>
                                                    {formatTime(nextAt)} with {activeSession.mentor_full_name}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground text-balance">Active mentorship</p>
                                                <p className="mt-1 text-lg text-tint-amber-foreground">Mentor: {activeSession.mentor_full_name}</p>
                                            </>
                                        )}
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {startingSoon ? (
                                                nextZoomUrl ? (
                                                    credits > 0 ? (
                                                        <a href={nextZoomUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), 'bg-success hover:bg-success/90')}>
                                                            <Video weight="fill" />
                                                            Join session
                                                        </a>
                                                    ) : (
                                                        <Link href="/dashboard/student/services" className={cn(buttonVariants(), 'bg-warning hover:bg-warning/90')}>
                                                            Top up to join
                                                        </Link>
                                                    )
                                                ) : (
                                                    <span className="inline-flex h-11 items-center rounded-full bg-card/70 px-4 text-sm text-tint-green-foreground">
                                                        Zoom link pending
                                                    </span>
                                                )
                                            ) : (
                                                canBook && bookButton('Book another session')
                                            )}
                                            <Link href="/dashboard/student/sessions" className={buttonVariants({ variant: 'secondary' })}>
                                                View my sessions
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            ) : pendingRequests.length > 0 ? (
                                <>
                                    <span className="grid size-20 shrink-0 place-items-center rounded-full bg-card text-tint-amber-foreground">
                                        <Hourglass weight="duotone" className="size-9" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-tint-amber-foreground">Up next</p>
                                        <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground">Request pending</p>
                                        <p className="mt-1 max-w-prose text-base text-tint-amber-foreground text-pretty">We've sent your request to your mentor. We'll let you know once they confirm a time.</p>
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <Link href="/dashboard/student/sessions" className={buttonVariants()}>
                                                View pending requests
                                            </Link>
                                            {canBook ? (
                                                <button type="button" onClick={tryOpenBookSession} className={buttonVariants({ variant: 'secondary' })}>
                                                    <Plus weight="bold" />
                                                    Book another session
                                                </button>
                                            ) : !profileComplete ? (
                                                <Link href="/dashboard/student/profile" className={buttonVariants({ variant: 'secondary' })}>
                                                    Complete profile to book
                                                </Link>
                                            ) : (
                                                <span className="inline-flex h-11 items-center px-1 text-sm text-tint-amber-foreground">
                                                    Your mentor will be assigned by the team soon.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span className="grid size-20 shrink-0 place-items-center rounded-full bg-card text-tint-amber-foreground">
                                        <Calendar weight="duotone" className="size-9" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-tint-amber-foreground">This week</p>
                                        <p className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                                            {sessionsThisWeek} {sessionsThisWeek === 1 ? 'session booked' : 'sessions booked'}
                                        </p>
                                        <p className="mt-1 text-lg text-tint-amber-foreground">
                                            {canBook ? 'Pick a few times that suit you and your mentor chooses one.' : !profileComplete ? 'Finish your profile so we can match you with a mentor.' : 'The team is choosing your mentor.'}
                                        </p>
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {bookButton('Book a session')}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Rise>

                    <Rise i={2}>
                        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-card border border-transparent bg-card p-6 text-center shadow-border">
                            <ProgressRing
                                value={credits}
                                max={Math.max(credits, 1)}
                                size={104}
                                stroke={8}
                                label={`${credits} hours left`}
                                tone={credits > 0 ? 'success' : 'warning'}
                            >
                                <span className="text-3xl font-semibold tracking-tight text-foreground">{credits}</span>
                            </ProgressRing>
                            <div>
                                <p className="font-medium text-foreground">{credits === 1 ? 'hour left' : 'hours left'}</p>
                                <p className="text-sm text-muted-foreground tabular-nums">
                                    {sessionsThisWeek} {sessionsThisWeek === 1 ? 'session' : 'sessions'} booked this week
                                </p>
                            </div>
                        </div>
                    </Rise>

                    <Rise i={3}>
                        <AcademicProfileCard userId={userId} userName={userName} />
                    </Rise>
                </div>

                {/* Application Timeline */}
                <Rise i={4}>
                    <ApplicationTimeline
                        applicationYear={academicProfile?.application_year}
                        entranceExamDate={academicProfile?.entrance_exam_date}
                        targetUniversity={academicProfile?.target_university}
                    />
                </Rise>

                {/* Weekly Calendar */}
                <Rise i={5}>
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
                </Rise>
            </div>
        </>
    )
}

/** "Today", "Tomorrow" or "In 3 days", counted in the student's timezone. */
function relativeDay(iso: string, timezone: string | null) {
    const tz = resolveTz(timezone)
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso))
    const diff = Math.round((Date.parse(day) - Date.parse(getZonedNow(tz).date)) / 86400000)
    if (diff <= 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `In ${diff} days`
}

/**
 * First-load entrance (better-ui): 100ms apart, 12px rise with 4px blur over
 * 300ms ease-out. Under reduced motion it only fades. Runs once per visit.
 */
function Rise({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
    return (
        <div
            className={cn('animate-in fade-in-0 slide-in-from-bottom-3 blur-in-4 duration-300 ease-snappy fill-mode-both motion-reduce:slide-in-from-bottom-0 motion-reduce:blur-in-0', className)}
            style={{ animationDelay: `${i * 100}ms` }}
        >
            {children}
        </div>
    )
}
