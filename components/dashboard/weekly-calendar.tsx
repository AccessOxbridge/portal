'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Video, Clock, Calendar as CalendarIcon, ExternalLink } from 'lucide-react'
import { formatTimeInTz } from '@/lib/timezone'

interface Session {
    id: string
    scheduled_at: string
    zoom_url: string | null
    person_name: string
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
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-gray-500 text-sm font-medium">Your schedule for the week</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrevWeek}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <button
                        onClick={handleNextWeek}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronRight className="w-6 h-6 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Week Days */}
            <div className="px-6 py-4 flex justify-between bg-gray-50/50">
                {weekDates.map((date, i) => (
                    <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center gap-1 group transition-all ${isSelected(date) ? 'scale-110' : 'hover:scale-105'
                            }`}
                    >
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected(date) ? 'text-accent' : 'text-gray-400'
                            }`}>
                            {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </span>
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full text-lg font-bold transition-all ${isToday(date)
                            ? isSelected(date) ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500 border border-red-200'
                            : isSelected(date) ? 'bg-accent text-white' : 'text-gray-600 group-hover:bg-gray-100'
                            }`}>
                            {date.getDate()}
                        </div>
                    </button>
                ))}
            </div>

            {/* Selected Day's Sessions */}
            <div className="p-6 min-h-[300px]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-accent" />
                        {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {daySessions.length} {daySessions.length === 1 ? 'Session' : 'Sessions'}
                    </span>
                </div>

                {daySessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-500">No sessions scheduled for this day</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {daySessions.map((session) => (
                            <div
                                key={session.id}
                                className="group relative bg-white border border-gray-100 p-5 rounded-2xl hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all cursor-pointer"
                                onClick={() => {
                                    if (session.zoom_url) {
                                        window.open(
                                            canJoinZoom ? session.zoom_url : '/dashboard/student/services',
                                            canJoinZoom ? '_blank' : '_self'
                                        )
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent font-bold text-xl">
                                            {session.person_name?.[0] || personLabel[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 group-hover:text-accent transition-colors">
                                                Session with {session.person_name}
                                            </h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 font-medium">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>
                                                    {formatTimeInTz(session.scheduled_at, timezone)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {session.zoom_url ? (
                                        <div className="flex items-center gap-2">
                                            <button className={`${canJoinZoom ? 'bg-accent' : 'bg-amber-500'} text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-[1.05] transition-transform`}>
                                                <Video className="w-4 h-4" />
                                                {canJoinZoom ? zoomButtonLabel : 'Top up to Join'}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-bold text-gray-400 italic">Zoom link pending</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
