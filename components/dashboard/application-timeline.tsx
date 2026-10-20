'use client'

import { FileText, PenNib as PenTool, Users, CalendarBlank as Calendar, Check } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'

interface ApplicationTimelineProps {
    applicationYear?: number | null
    entranceExamDate?: string | null
    /** Display only: titles the card "Road to Cambridge" when set. */
    targetUniversity?: string | null
}

export default function ApplicationTimeline({ applicationYear, entranceExamDate, targetUniversity }: ApplicationTimelineProps) {
    const now = new Date()
    const currentYear = applicationYear || now.getFullYear()

    // Use the student's own entrance exam date if they've set one; otherwise
    // fall back to the generic October 20 placeholder milestone.
    const entranceExamMilestoneDate = entranceExamDate
        ? new Date(entranceExamDate)
        : new Date(currentYear, 9, 20) // October 20

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
            label: 'Personal statement',
            date: new Date(currentYear, 8, 30), // September 30
            icon: FileText,
            description: 'Complete & submit'
        },
        {
            id: 'entrance_exam',
            label: 'Entrance exam',
            date: entranceExamMilestoneDate,
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
        <div className="rounded-card bg-card p-5 shadow-border sm:p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">{targetUniversity ? `Road to ${targetUniversity}` : 'Application timeline'}</h3>
                <span className="text-sm text-muted-foreground tabular-nums">{currentYear} entry</span>
            </div>

            {/* Timeline Container */}
            <div className="relative pt-1 pb-2">
                {/* Background Track: dashed, because what's ahead isn't done yet */}
                <div className="absolute top-6 left-[12.5%] right-[12.5%] border-t-2 border-dashed border-input sm:top-7" />

                {/* Progress Fill */}
                <div
                    className="absolute top-6 left-[12.5%] h-0.5 -translate-y-px rounded-full bg-brand transition-[width] duration-1000 ease-snappy motion-reduce:transition-none sm:top-7"
                    style={{ width: `${currentProgress * 0.75}%` }}
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
                                className="flex flex-col items-center px-1 text-center"
                                style={{ width: `${100 / sortedMilestones.length}%` }}
                            >
                                {/* Done: solid check. Today: blue ring. Soon: amber. Later: dashed. */}
                                <div className={cn(
                                    'relative z-10 grid size-10 place-items-center rounded-full sm:size-12',
                                    status === 'completed' && 'bg-success text-white',
                                    status === 'current' && 'bg-brand text-white ring-4 ring-tint-blue',
                                    status === 'upcoming' && 'bg-tint-amber text-tint-amber-foreground ring-2 ring-warning',
                                    status === 'future' && 'border-2 border-dashed border-input bg-card text-muted-foreground',
                                )}>
                                    {status === 'completed'
                                        ? <Check weight="bold" className="size-5" />
                                        : <Icon weight={status === 'future' ? 'regular' : 'fill'} className="size-5" />}
                                </div>

                                {/* Label */}
                                <span className={cn(
                                    'mt-2.5 text-sm font-medium leading-tight text-balance',
                                    status === 'current' ? 'text-brand' : status === 'future' ? 'text-muted-foreground' : 'text-foreground',
                                )}>
                                    {milestone.label}
                                </span>

                                {/* Date */}
                                <span className="mt-1 text-xs text-muted-foreground tabular-nums">
                                    {formatDate(milestone.date)}
                                </span>

                                {/* Days until badge */}
                                {milestone.id !== 'today' && daysUntil > 0 && (
                                    <span className={cn(
                                        'mt-2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                                        daysUntil <= 7
                                            ? 'bg-tint-rose text-tint-rose-foreground'
                                            : daysUntil <= 14
                                                ? 'bg-tint-amber text-tint-amber-foreground'
                                                : 'bg-muted text-muted-foreground',
                                    )}>
                                        {daysUntil} days
                                    </span>
                                )}
                                {milestone.id !== 'today' && daysUntil <= 0 && (
                                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-tint-green px-2 py-0.5 text-xs font-medium text-tint-green-foreground">
                                        <Check weight="bold" className="size-3" /> Done
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
