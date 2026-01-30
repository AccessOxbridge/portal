'use client'

import { FileText, PenTool, Users, Calendar } from 'lucide-react'

interface ApplicationTimelineProps {
    applicationYear?: number | null
}

export default function ApplicationTimeline({ applicationYear }: ApplicationTimelineProps) {
    const now = new Date()
    const currentYear = applicationYear || now.getFullYear()

    // Define key milestones with dates
    const milestones = [
        {
            id: 'today',
            label: 'Today',
            date: now,
            icon: Calendar,
            description: 'Current position'
        },
        {
            id: 'personal_statement',
            label: 'Personal Statement',
            date: new Date(currentYear, 8, 30), // September 30
            icon: FileText,
            description: 'Complete & submit'
        },
        {
            id: 'entrance_exam',
            label: 'Entrance Exam',
            date: new Date(currentYear, 9, 20), // October 20
            icon: PenTool,
            description: 'UCAT/BMAT/MAT/etc'
        },
        {
            id: 'interviews',
            label: 'Interviews',
            date: new Date(currentYear, 10, 25), // November 25
            icon: Users,
            description: 'College interviews'
        }
    ]

    // Sort milestones by date
    const sortedMilestones = [...milestones].sort((a, b) => a.date.getTime() - b.date.getTime())

    // Calculate progress percentage
    const firstDate = sortedMilestones[0].date.getTime()
    const lastDate = sortedMilestones[sortedMilestones.length - 1].date.getTime()
    const totalRange = lastDate - firstDate
    const currentProgress = Math.min(100, Math.max(0, ((now.getTime() - firstDate) / totalRange) * 100))

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        })
    }

    const getDaysUntil = (date: Date) => {
        const diffTime = date.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    const getMilestoneStatus = (date: Date, id: string) => {
        if (id === 'today') return 'current'
        const daysUntil = getDaysUntil(date)
        if (daysUntil < 0) return 'completed'
        if (daysUntil <= 14) return 'upcoming'
        return 'future'
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Application Timeline</h3>
                <span className="text-xs font-medium text-gray-400">{currentYear} Entry</span>
            </div>

            {/* Timeline Container */}
            <div className="relative pt-2 pb-8">
                {/* Background Track */}
                <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full" />

                {/* Progress Fill */}
                <div
                    className="absolute top-8 left-0 h-1 bg-gradient-to-r from-accent to-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${currentProgress}%` }}
                />

                {/* Milestones */}
                <div className="relative flex justify-between">
                    {sortedMilestones.map((milestone, index) => {
                        const status = getMilestoneStatus(milestone.date, milestone.id)
                        const daysUntil = getDaysUntil(milestone.date)
                        const Icon = milestone.icon

                        return (
                            <div
                                key={milestone.id}
                                className="flex flex-col items-center text-center"
                                style={{ width: `${100 / sortedMilestones.length}%` }}
                            >
                                {/* Icon Circle */}
                                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${status === 'completed'
                                        ? 'bg-green-500 text-white'
                                        : status === 'current'
                                            ? 'bg-accent text-white ring-4 ring-accent/20'
                                            : status === 'upcoming'
                                                ? 'bg-amber-500 text-white ring-4 ring-amber-200'
                                                : 'bg-white text-gray-400 border-2 border-gray-200'
                                    }`}>
                                    <Icon className="w-5 h-5" />
                                </div>

                                {/* Label */}
                                <span className={`mt-3 text-sm font-semibold ${status === 'completed'
                                        ? 'text-green-600'
                                        : status === 'current'
                                            ? 'text-accent'
                                            : status === 'upcoming'
                                                ? 'text-amber-600'
                                                : 'text-gray-500'
                                    }`}>
                                    {milestone.label}
                                </span>

                                {/* Date */}
                                <span className="text-xs text-gray-400 mt-1">
                                    {formatDate(milestone.date)}
                                </span>

                                {/* Days until badge */}
                                {milestone.id !== 'today' && daysUntil > 0 && (
                                    <span className={`mt-2 px-2 py-0.5 rounded-full text-xs font-bold ${daysUntil <= 7
                                            ? 'bg-red-100 text-red-600'
                                            : daysUntil <= 14
                                                ? 'bg-amber-100 text-amber-600'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {daysUntil} days
                                    </span>
                                )}
                                {milestone.id !== 'today' && daysUntil <= 0 && (
                                    <span className="mt-2 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-600">
                                        ✓ Done
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
