'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { Check, CheckCheck, AlertCircle, RotateCw } from 'lucide-react'
import { cn } from '@/utils/lib'
import CollapsibleText from './collapsible-text'
import AttachmentGrid from './attachment-grid'
import type { ChatAttachment } from '@/lib/chat-attachments'

export type MessageStatus = 'sending' | 'sent' | 'failed'

/**
 * Asymmetric by design: only *your own* messages get a tinted bubble.
 * Incoming messages render as avatar + name + plain text, the way Nextdoor and
 * Slack do it. Two-sided bubbles are the default look of a thrown-together
 * chat, and they read badly here specifically because mentors write long
 * paragraphs — prose is much easier to read unboxed.
 */

interface MessageBubbleProps {
    content: string
    attachments?: ChatAttachment[] | null
    isSent: boolean
    timestamp: string
    isRead?: boolean
    senderName?: string
    avatarUrl?: string | null
    /** First message in a run from the same sender — carries avatar and name. */
    isFirstInGroup?: boolean
    /** Last message in a run — carries the tail corner and the sent receipt. */
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
    avatarUrl,
    isFirstInGroup = true,
    isLastInGroup = true,
    status = 'sent',
    signedUrls,
    onOpenImage,
    onRetry,
}: MessageBubbleProps) {
    const hasText = content.trim().length > 0
    const hasAttachments = !!attachments && attachments.length > 0
    const failed = status === 'failed'

    const failureNotice = (
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
    )

    // ---------------------------------------------------------------- incoming
    if (!isSent) {
        return (
            <div className="flex gap-2.5">
                <div className="w-8 shrink-0">
                    {isFirstInGroup &&
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

                <div className="min-w-0 max-w-[85%]">
                    {isFirstInGroup && (
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-gray-900">
                                {senderName || 'User'}
                            </span>
                            <span className="text-[11px] text-gray-400 tabular-nums">
                                {formatTime(timestamp)}
                            </span>
                        </div>
                    )}

                    {hasAttachments && (
                        <div className={cn(hasText && 'mb-1.5')}>
                            <AttachmentGrid
                                attachments={attachments}
                                signedUrls={signedUrls}
                                isSent={false}
                                onOpenImage={onOpenImage}
                            />
                        </div>
                    )}

                    {hasText && (
                        <div className="text-gray-700">
                            <CollapsibleText content={content} />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ---------------------------------------------------------------- outgoing
    return (
        <div className="flex flex-col items-end">
            {hasAttachments && (
                <div className={cn(hasText && 'mb-1.5')}>
                    <AttachmentGrid
                        attachments={attachments}
                        signedUrls={signedUrls}
                        isSent
                        onOpenImage={onOpenImage}
                    />
                </div>
            )}

            {hasText && (
                <div
                    className={cn(
                        'max-w-[75%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl bg-accent text-white transition-opacity',
                        isLastInGroup && 'rounded-br-md',
                        status === 'sending' && 'opacity-70',
                        failed && 'bg-accent/70'
                    )}
                >
                    <CollapsibleText content={content} onDark fadeFrom="from-accent" />
                </div>
            )}

            {isLastInGroup && (
                <div className="flex items-center gap-1.5 mt-1 px-0.5">
                    {failed ? (
                        failureNotice
                    ) : (
                        <>
                            <span className="text-[11px] text-gray-400 tabular-nums">
                                {formatTime(timestamp)}
                            </span>
                            {status === 'sent' && (
                                // Icons rather than '✓✓' text, which renders as
                                // different glyphs across platforms.
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
    )
}
