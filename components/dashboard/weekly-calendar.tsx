'use client'

import React, { useState, useEffect } from 'react'
import { CaretLeft as ChevronLeft, CaretRight as ChevronRight, VideoCamera as Video, Clock, CalendarBlank as CalendarIcon, ArrowSquareOut as ExternalLink, Check } from '@phosphor-icons/react/ssr'
import { formatTimeInTz } from '@/lib/timezone'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/lib'

interface Session {
    id: string
    scheduled_at: string
    zoom_url: string | null
    person_name: string
    /** Used to tell when a past session has ended (60 minutes if unknown). */
    duration_minutes?: number | null
}

interface WeeklyCalendarProps {
    sessions: Session[]
    personLabel?: string // e.g., "Mentor" or "Student"
    zoomButtonLabel?: string
    /** When set, students with 0 credits are sent to top-up instead of Zoom. Omit for mentors. */
    credits?: number
    timezone?: string | null
}

export default function WeeklyCalendar({ sessions, personLabel = 'Mentor', zoomButtonLabel = 'Join Zoom', credits, timezone = null }: WeeklyCalendarProps) {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [weekDates, setWeekDates] = useState<Date[]>([])
    // Mentors omit `credits`; only students pass a balance and need the top-up gate.
    const creditsRequired = typeof credits === 'number'
    const canJoinZoom = !creditsRequired || credits > 0

    useEffect(() => {
        const dates = []
        const curr = new Date(selectedDate)
        const first = curr.getDate() - curr.getDay() // Sunday as start of week

        for (let i = 0; i < 7; i++) {
            const next = new Date(curr.getTime())
            next.setDate(first + i)
            dates.push(next)
        }
        setWeekDates(dates)
    }, [selectedDate])

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            weekday: 'short'
        })
    }

    const isToday = (date: Date) => {
        const today = new Date()
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
    }

    const isSelected = (date: Date) => {
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
    }

    const getSessionsForDate = (date: Date) => {
        return sessions.filter(s => {
            const sessionDate = new Date(s.scheduled_at)
            return sessionDate.getDate() === date.getDate() &&
                sessionDate.getMonth() === date.getMonth() &&
                sessionDate.getFullYear() === date.getFullYear()
        })
    }

    const handlePrevWeek = () => {
        const prev = new Date(selectedDate)
        prev.setDate(prev.getDate() - 7)
        setSelectedDate(prev)
    }

    const handleNextWeek = () => {
        const next = new Date(selectedDate)
        next.setDate(next.getDate() + 7)
        setSelectedDate(next)
    }

    const daySessions = getSessionsForDate(selectedDate)

    return (
        <div className="overflow-hidden rounded-card bg-card shadow-border">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-foreground sm:text-xl">
                        {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-sm text-muted-foreground">Your schedule for the week</p>
                </div>
                <div className="flex shrink-0 gap-1">
                    <button
                        onClick={handlePrevWeek}
                        aria-label="Previous week"
                        className={iconButton}
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                    <button
                        onClick={handleNextWeek}
                        aria-label="Next week"
                        className={iconButton}
                    >
                        <ChevronRight className="size-5" />
                    </button>
                </div>
            </div>

            {/* Week strip and the chosen day's sessions: side by side on wide
                screens, stacked on phones. */}
            <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1 px-3 pb-4 sm:px-6 md:pb-6">
                {weekDates.map((date, i) => (
                    <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        aria-pressed={isSelected(date)}
                        className="group flex flex-col items-center gap-1.5 rounded-control py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    >
                        <span className={cn('text-xs font-medium', isSelected(date) ? 'text-foreground' : 'text-muted-foreground')}>
                            {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </span>
                        <span className={cn(
                            'grid size-10 place-items-center rounded-full text-base font-medium tabular-nums transition-[background-color,color,scale] duration-150 ease-out group-active:scale-[0.96]',
                            isSelected(date)
                                ? 'bg-primary text-primary-foreground'
                                : isToday(date)
                                    ? 'text-brand ring-2 ring-inset ring-brand/40 group-hover:bg-tint-blue'
                                    : 'text-foreground group-hover:bg-muted',
                        )}>
                            {date.getDate()}
                        </span>
                        {/* A dot under days that have a session. */}
                        <span className={cn('size-1 rounded-full', getSessionsForDate(date).length > 0 ? 'bg-brand' : 'bg-transparent')} />
                    </button>
                ))}
            </div>

            {/* Selected Day's Sessions */}
            <div className="min-h-[200px] border-t border-border p-5 sm:p-6 md:min-h-0 md:border-t-0 md:border-s md:pt-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
                        <CalendarIcon weight="duotone" className="size-5 shrink-0 text-brand" />
                        <span className="truncate">
                            {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </h3>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                        {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'}
                    </span>
                </div>

                {daySessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center md:py-6">
                        <span className="mb-3 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                            <Clock weight="duotone" className="size-6" />
                        </span>
                        <p className="text-sm text-muted-foreground">No sessions scheduled for this day</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {daySessions.map((session) => {
                            // A session that has finished stays visible but can't be
                            // joined: its Zoom room is closed.
                            const ended = new Date(session.scheduled_at).getTime() + (session.duration_minutes ?? 60) * 60000 < Date.now()
                            return (
                            <div
                                key={session.id}
                                className={cn(
                                    'group relative rounded-card border border-transparent bg-card p-4 shadow-border',
                                    !ended && 'cursor-pointer transition-shadow duration-150 ease-out hover:shadow-border-hover',
                                )}
                                onClick={() => {
                                    if (session.zoom_url && !ended) {
                                        window.open(
                                            canJoinZoom ? session.zoom_url : '/dashboard/student/services',
                                            canJoinZoom ? '_blank' : '_self'
                                        )
                                    }
                                }}
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <div className="flex min-w-0 items-center gap-3.5">
                                        <Avatar name={session.person_name || personLabel} size="md" />
                                        <div className="min-w-0">
                                            <h4 className="truncate font-medium text-foreground">
                                                Session with {session.person_name}
                                            </h4>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                                                <Clock className="size-3.5" />
                                                <span>
                                                    {formatTimeInTz(session.scheduled_at, timezone)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {ended ? (
                                        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:self-auto">
                                            <Check weight="bold" className="size-3" />
                                            Ended
                                        </span>
                                    ) : session.zoom_url ? (
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button className={cn(buttonVariants({ size: 'sm' }), 'w-full sm:w-auto', !canJoinZoom && 'bg-warning hover:bg-warning/90')}>
                                                <Video weight="fill" />
                                                {canJoinZoom ? zoomButtonLabel : 'Top up to join'}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Zoom link pending</span>
                                    )}
                                </div>
                            </div>
                            )
                        })}
                    </div>
                )}
            </div>
            </div>
        </div>
    )
}

const iconButton = 'grid size-10 place-items-center rounded-full text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40'
