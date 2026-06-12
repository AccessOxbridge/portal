'use client'

import { format, isToday, isYesterday } from 'date-fns'

interface InterventionBubbleProps {
    content: string
    timestamp: string
}

/**
 * A centered, third-party message bubble used when the Access Oxbridge team
 * steps into a mentor↔student conversation. Visually distinct from the two
 * participants' bubbles so it reads as an official team note.
 */
export default function InterventionBubble({ content, timestamp }: InterventionBubbleProps) {
    const formatTime = (ts: string) => {
        const date = new Date(ts)
        if (isToday(date)) return format(date, 'h:mm a')
        if (isYesterday(date)) return 'Yesterday ' + format(date, 'h:mm a')
        return format(date, 'MMM d, h:mm a')
    }

    return (
        <div className="flex gap-2 flex-row">
            {/* Avatar */}
            <div className="shrink-0 mt-auto">
                <div className="w-8 h-8 rounded-full bg-white border border-accent/20 flex items-center justify-center overflow-hidden">
                    <img src="/logo.png" alt="Access Oxbridge" className="w-5 h-5 object-contain" />
                </div>
            </div>

            <div className="max-w-[70%] items-start">
                <span className="text-[11px] font-semibold text-accent ml-1">Claire Marlowe</span>
                <div className="mt-1 px-4 py-2.5 rounded-2xl rounded-bl-md bg-accent/5 border border-accent/15">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{content}</p>
                </div>
                <div className="flex items-center gap-1 mt-1 justify-start">
                    <span className="text-[10px] text-gray-400">{formatTime(timestamp)}</span>
                </div>
            </div>
        </div>
    )
}
