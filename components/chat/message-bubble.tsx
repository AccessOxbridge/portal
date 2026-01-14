'use client'

import { format, isToday, isYesterday } from 'date-fns'

interface MessageBubbleProps {
    content: string
    isSent: boolean
    timestamp: string
    isRead?: boolean
    senderName?: string
    showAvatar?: boolean
    avatarUrl?: string | null
}

export default function MessageBubble({
    content,
    isSent,
    timestamp,
    isRead,
    senderName,
    showAvatar = false,
    avatarUrl
}: MessageBubbleProps) {
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp)
        if (isToday(date)) {
            return format(date, 'h:mm a')
        } else if (isYesterday(date)) {
            return 'Yesterday ' + format(date, 'h:mm a')
        }
        return format(date, 'MMM d, h:mm a')
    }

    return (
        <div className={`flex gap-2 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar for received messages */}
            {!isSent && showAvatar && (
                <div className="shrink-0 mt-auto">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={senderName || 'User'}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">
                            {senderName?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                </div>
            )}

            {/* Spacer for alignment when no avatar */}
            {!isSent && !showAvatar && <div className="w-8 shrink-0" />}

            <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'}`}>
                <div
                    className={`px-4 py-2.5 rounded-2xl ${isSent
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}
                >
                    <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-gray-400">{formatTime(timestamp)}</span>
                    {isSent && (
                        <span className="text-[10px] text-gray-400">
                            {isRead ? '✓✓' : '✓'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
