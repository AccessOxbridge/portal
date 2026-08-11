'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { Check, CheckCheck, AlertCircle, RotateCw } from 'lucide-react'
import { cn } from '@/utils/lib'
import RichText from './rich-text'
import AttachmentGrid from './attachment-grid'
import type { ChatAttachment } from '@/lib/chat-attachments'

export type MessageStatus = 'sending' | 'sent' | 'failed'

interface MessageBubbleProps {
    content: string
    attachments?: ChatAttachment[] | null
    isSent: boolean
    timestamp: string
    isRead?: boolean
    senderName?: string
    showAvatar?: boolean
    avatarUrl?: string | null
    /** Last message in a run from the same sender — gets the tail corner. */
    isLastInGroup?: boolean
    status?: MessageStatus
    signedUrls: Map<string, string>
    onOpenImage: (attachment: ChatAttachment) => void
    onRetry?: () => void
}

function formatTime(timestamp: string) {
    const date = new Date(timestamp)
    if (isToday(date) || isYesterday(date)) return format(date, 'h:mm a')
    return format(date, 'MMM d, h:mm a')
}

export default function MessageBubble({
    content,
    attachments,
    isSent,
    timestamp,
    isRead,
    senderName,
    showAvatar = false,
    avatarUrl,
    isLastInGroup = true,
    status = 'sent',
    signedUrls,
    onOpenImage,
    onRetry,
}: MessageBubbleProps) {
    const hasText = content.trim().length > 0
    const hasAttachments = !!attachments && attachments.length > 0
    const failed = status === 'failed'

    return (
        <div className={cn('flex gap-2', isSent ? 'flex-row-reverse' : 'flex-row')}>
            {!isSent && (
                <div className="w-8 shrink-0 mt-auto">
                    {showAvatar &&
                        (avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarUrl}
                                alt={senderName || 'User'}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-semibold">
                                {senderName?.[0]?.toUpperCase() || 'U'}
                            </div>
                        ))}
                </div>
            )}

            <div className={cn('flex flex-col gap-1.5 max-w-[75%] sm:max-w-[70%]', isSent ? 'items-end' : 'items-start')}>
                {hasAttachments && (
                    <AttachmentGrid
                        attachments={attachments}
                        signedUrls={signedUrls}
                        isSent={isSent}
                        onOpenImage={onOpenImage}
                    />
                )}

                {hasText && (
                    <div
                        className={cn(
                            'px-3.5 py-2.5 rounded-2xl transition-opacity',
                            isSent
                                ? 'bg-accent text-white'
                                : 'bg-white text-gray-800 border border-gray-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
                            // Tail corner only on the final bubble of a run.
                            isLastInGroup && (isSent ? 'rounded-br-md' : 'rounded-bl-md'),
                            status === 'sending' && 'opacity-70',
                            failed && 'border-red-200'
                        )}
                    >
                        <RichText content={content} onDark={isSent} />
                    </div>
                )}

                {isLastInGroup && (
                    <div
                        className={cn(
                            'flex items-center gap-1.5 px-0.5',
                            isSent ? 'justify-end' : 'justify-start'
                        )}
                    >
                        {failed ? (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors"
                            >
                                <AlertCircle className="w-3 h-3" />
                                Not sent
                                {onRetry && (
                                    <>
                                        <span className="text-red-300">·</span>
                                        <RotateCw className="w-3 h-3" />
                                        Retry
                                    </>
                                )}
                            </button>
                        ) : (
                            <>
                                <span className="text-[11px] text-gray-400 tabular-nums">
                                    {formatTime(timestamp)}
                                </span>
                                {isSent && status === 'sent' && (
                                    // Icons rather than '✓✓' text: the literal
                                    // glyphs render inconsistently across platforms.
                                    <span className={isRead ? 'text-accent' : 'text-gray-300'}>
                                        {isRead ? (
                                            <CheckCheck className="w-3.5 h-3.5" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5" />
                                        )}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
