'use client'

import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface JourneyTimelineProps {
    hasProfile: boolean
    hasPendingRequests: boolean
    hasActiveMentorship: boolean
    hasScheduledSession: boolean
    hasCompletedSession: boolean
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
    hasCompletedSession
}: JourneyTimelineProps) {
    const getStageStatus = (stageId: string): 'completed' | 'current' | 'pending' => {
        switch (stageId) {
            case 'profile':
                return hasProfile ? 'completed' : 'current'
            case 'request':
                if (!hasProfile) return 'pending'
                if (hasPendingRequests || hasActiveMentorship || hasCompletedSession) return 'completed'
                return 'current'
            case 'matched':
                if (!hasProfile) return 'pending'
                if (hasActiveMentorship || hasCompletedSession) return 'completed'
                if (hasPendingRequests) return 'current'
                return 'pending'
            case 'scheduled':
                if (hasCompletedSession) return 'completed'
                if (hasScheduledSession) return 'completed'
                if (hasActiveMentorship) return 'current'
                return 'pending'
            case 'completed':
                if (hasCompletedSession) return 'completed'
                if (hasScheduledSession) return 'current'
                return 'pending'
            default:
                return 'pending'
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 p-6 mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-6">Your Application Journey</h3>

            <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" />

                {stages.map((stage, index) => {
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
