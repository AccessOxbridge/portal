'use client'

import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface JourneyTimelineProps {
    hasProfile: boolean
    hasPendingRequests: boolean
    hasActiveMentorship: boolean
    hasScheduledSession: boolean
    hasCompletedSession: boolean
    completedSessionsCount: number
}

const stages = [
    { id: 'profile', label: 'Profile Complete', description: 'Set up your academic profile' },
    { id: 'request', label: 'Mentor Requested', description: 'Submitted a mentorship request' },
    { id: 'matched', label: 'Mentor Matched', description: 'A mentor accepted your request' },
    { id: 'scheduled', label: 'Session Scheduled', description: 'Your session is booked' },
    { id: 'completed', label: 'Session Complete', description: 'First session finished' },
]

export default function JourneyTimeline({
    hasProfile,
    hasPendingRequests,
    hasActiveMentorship,
    hasScheduledSession,
    hasCompletedSession,
    completedSessionsCount
}: JourneyTimelineProps) {
    const isIdle = !hasPendingRequests && !hasActiveMentorship && !hasScheduledSession

    // Reflect current status: one "current" step at a time.
    // When idle (no pending/active/scheduled session), treat this as the start of a new cycle:
    // show profile/request only, and keep later steps gray even if they've completed sessions before.
    const getStageStatus = (stageId: string): 'completed' | 'current' | 'pending' => {
        if (isIdle) {
            switch (stageId) {
                case 'profile':
                    return hasProfile ? 'completed' : 'current'
                case 'request':
                    return hasProfile ? 'current' : 'pending'
                default:
                    return 'pending'
            }
        }

        switch (stageId) {
            case 'profile':
                return hasProfile ? 'completed' : 'current'
            case 'request':
                if (!hasProfile) return 'pending'
                // Completed only if they have a request/session *right now* (pending or matched)
                if (hasPendingRequests || hasActiveMentorship) return 'completed'
                return 'current' // next step: book a session
            case 'matched':
                if (!hasProfile) return 'pending'
                if (hasActiveMentorship) return 'completed'
                if (hasPendingRequests) return 'current' // waiting for a mentor to accept
                return 'pending'
            case 'scheduled':
                if (hasScheduledSession) return 'completed'
                if (hasActiveMentorship) return 'current' // matched, waiting for a time to be set
                return 'pending'
            case 'completed':
                // Only show as completed when there are no upcoming sessions. If there's an upcoming
                // session, show as current (waiting for that session to complete).
                if (hasScheduledSession) return 'current' // session booked, waiting for it to happen
                if (hasCompletedSession) return 'completed' // at least one session done, no upcoming
                return 'pending'
            default:
                return 'pending'
        }
    }

    const currentStage = stages.find((_, i) => getStageStatus(stages[i].id) === 'current')

    let subtitle: string | null = null
    if (!hasProfile) {
        subtitle = 'Complete your profile to start booking sessions.'
    } else if (isIdle) {
        subtitle = 'Next: book a session below to get matched with a mentor.'
    } else if (hasPendingRequests) {
        subtitle = 'We’re finding the right mentor for you.'
    } else if (hasScheduledSession) {
        subtitle = 'Your first session is scheduled.'
    } else if (hasActiveMentorship) {
        subtitle = 'You have an active mentorship in progress.'
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 p-6 mb-8">
            <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Your Application Journey</h3>
                    {subtitle && (
                        <p className="text-sm text-gray-500 mt-1 sm:mt-1.5">{subtitle}</p>
                    )}
                </div>
                {completedSessionsCount > 0 && (
                    <p className="text-sm font-semibold text-emerald-600 sm:text-right">
                        You’ve completed {completedSessionsCount} {completedSessionsCount === 1 ? 'session' : 'sessions'} so far
                    </p>
                )}
            </div>

            <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" />

                {stages.map((stage, index) => {
                    if (stage.id === 'completed') return null
                    const status = getStageStatus(stage.id)

                    return (
                        <div key={stage.id} className="flex flex-col items-center text-center flex-1">
                            {/* Icon */}
                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${status === 'completed'
                                    ? 'bg-green-500 text-white'
                                    : status === 'current'
                                        ? 'bg-accent text-white ring-4 ring-accent/20 animate-pulse'
                                        : 'bg-gray-100 text-gray-400'
                                }`}>
                                {status === 'completed' ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : status === 'current' ? (
                                    <Clock className="w-5 h-5" />
                                ) : (
                                    <Circle className="w-5 h-5" />
                                )}
                            </div>

                            {/* Label */}
                            <span className={`mt-3 text-xs font-semibold ${status === 'completed'
                                    ? 'text-green-600'
                                    : status === 'current'
                                        ? 'text-accent'
                                        : 'text-gray-400'
                                }`}>
                                {stage.label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
