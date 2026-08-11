'use client'

import { format, isToday, isYesterday, isThisYear } from 'date-fns'

/** Sticky day marker between runs of messages. */
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
        <div className="sticky top-0 z-10 flex justify-center py-1">
            <span className="px-3 py-1 rounded-full bg-white/85 backdrop-blur-sm border border-gray-200/70 text-[11px] font-semibold text-gray-500 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                {label}
            </span>
        </div>
    )
}
