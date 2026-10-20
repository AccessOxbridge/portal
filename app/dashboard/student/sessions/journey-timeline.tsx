'use client'

import { Check } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'

interface JourneyTimelineProps {
    hasProfile: boolean
    hasPendingRequests: boolean
    hasActiveMentorship: boolean
    hasScheduledSession: boolean
    hasCompletedSession: boolean
    completedSessionsCount: number
}

const stages = [
    { id: 'profile', label: 'Profile complete', description: 'Set up your academic profile' },
    { id: 'request', label: 'Mentor requested', description: 'Submitted a mentorship request' },
    { id: 'matched', label: 'Mentor matched', description: 'A mentor accepted your request' },
    { id: 'scheduled', label: 'Session scheduled', description: 'Your session is booked' },
    { id: 'completed', label: 'Session complete', description: 'First session finished' },
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
    // Once a session has happened the setup steps are done for good: the bar
    // stays ticked and only the line underneath follows the next booking.
    const isReturning = hasProfile && hasCompletedSession

    // Reflect current status: one "current" step at a time.
    // When idle (no pending/active/scheduled session), treat this as the start of a new cycle:
    // show profile/request only, and keep later steps gray even if they've completed sessions before.
    const getStageStatus = (stageId: string): 'completed' | 'current' | 'pending' => {
        if (isReturning) return 'completed'

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
    } else if (isReturning) {
        if (hasScheduledSession) subtitle = 'Your next session is booked.'
        else if (hasPendingRequests) subtitle = 'Waiting for your mentor to confirm your next session.'
        else if (hasActiveMentorship) subtitle = 'Your mentor is setting a time for your next session.'
        else subtitle = 'Book your next session whenever you’re ready.'
    } else if (isIdle) {
        subtitle = 'Next: book a session below to get matched with a mentor.'
    } else if (hasPendingRequests) {
        subtitle = 'We’re finding the right mentor for you.'
    } else if (hasScheduledSession) {
        subtitle = 'Your first session is scheduled.'
    } else if (hasActiveMentorship) {
        subtitle = 'You have an active mentorship in progress.'
    }

    // The four steps shown (the last stage is tracked but not drawn).
    const shown = stages.filter((stage) => stage.id !== 'completed')

    return (
        <div className="mb-6 rounded-card bg-card p-5 shadow-border sm:p-6">
            <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground">Your application journey</h3>
                    {subtitle && (
                        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{subtitle}</p>
                    )}
                </div>
                {completedSessionsCount > 0 && (
                    <p className="text-sm font-medium text-success sm:text-right">
                        You’ve completed {completedSessionsCount} {completedSessionsCount === 1 ? 'session' : 'sessions'} so far
                    </p>
                )}
            </div>

            <ol className="flex items-start">
                {shown.map((stage, index) => {
                    const status = getStageStatus(stage.id)
                    const next = shown[index + 1]

                    return (
                        <li key={stage.id} className="relative flex flex-1 flex-col items-center text-center" aria-current={status === 'current' ? 'step' : undefined}>
                            {/* Connector to the next step: solid once this step is done, dashed until then. */}
                            {next && (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'absolute top-[17px] left-[calc(50%+22px)] right-[calc(-50%+22px)] border-t-2',
                                        status === 'completed' ? 'border-solid border-success/50' : 'border-dashed border-input',
                                    )}
                                />
                            )}

                            {/* Done: solid check. Current: blue ring with a dot. Not yet: dashed circle. */}
                            {status === 'completed' ? (
                                <span className="relative z-10 grid size-9 place-items-center rounded-full bg-success text-white">
                                    <Check weight="bold" className="size-4" />
                                    <span className="sr-only">Done:</span>
                                </span>
                            ) : status === 'current' ? (
                                <span className="relative z-10 grid size-9 place-items-center rounded-full bg-card ring-2 ring-inset ring-brand">
                                    <span className="size-3 rounded-full bg-brand" />
                                    <span className="sr-only">Current step:</span>
                                </span>
                            ) : (
                                <span className="relative z-10 size-9 rounded-full border-2 border-dashed border-input bg-card">
                                    <span className="sr-only">Not started:</span>
                                </span>
                            )}

                            {/* Label */}
                            <span className={cn(
                                'mt-2.5 px-1 text-xs font-medium leading-tight text-balance sm:text-sm',
                                status === 'current' ? 'text-foreground' : status === 'completed' ? 'text-foreground' : 'text-muted-foreground',
                            )}>
                                {stage.label}
                            </span>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
