'use client'

import { format, isToday, isYesterday, isThisYear } from 'date-fns'

/**
 * Day marker: a hairline rule with the label sitting in the gap.
 *
 * The earlier floating pill fought for attention against an unbubbled thread;
 * a rule recedes and lets the messages carry the page.
 */
export default function DateSeparator({ timestamp }: { timestamp: string }) {
    const date = new Date(timestamp)

    const label = isToday(date)
        ? 'Today'
        : isYesterday(date)
            ? 'Yesterday'
            : isThisYear(date)
                ? format(date, 'EEEE, d MMMM')
                : format(date, 'd MMMM yyyy')

    return (
        <div className="flex items-center gap-3 py-3" role="separator" aria-label={label}>
            <span className="flex-1 h-px bg-gray-200/70" />
            <span className="text-[11px] font-medium text-gray-400 tracking-wide">{label}</span>
            <span className="flex-1 h-px bg-gray-200/70" />
        </div>
    )
}
