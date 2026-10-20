'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { Check, Checks as CheckCheck, WarningCircle as AlertCircle, ArrowClockwise as RotateCw } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import { Avatar } from '@/components/ui/avatar'
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
            className="flex items-center gap-1 text-[11px] font-medium text-destructive hover:text-destructive transition-colors"
        >
            <AlertCircle className="size-3" />
            Not sent
            {onRetry && (
                <>
                    <span className="text-destructive/40">·</span>
                    <RotateCw className="size-3" />
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
                    {isFirstInGroup && <Avatar name={senderName || 'User'} src={avatarUrl} size="sm" />}
                </div>

                <div className="min-w-0 max-w-[85%]">
                    {isFirstInGroup && (
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-foreground">
                                {senderName || 'User'}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
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
                        <div className="text-foreground">
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
                        'max-w-[75%] sm:max-w-[70%] px-3.5 py-2.5 rounded-card bg-primary text-white transition-opacity',
                        isLastInGroup && 'rounded-br-md',
                        status === 'sending' && 'opacity-70',
                        failed && 'bg-primary/70'
                    )}
                >
                    <CollapsibleText content={content} onDark fadeFrom="from-primary" />
                </div>
            )}

            {isLastInGroup && (
                <div className="flex items-center gap-1.5 mt-1 px-0.5">
                    {failed ? (
                        failureNotice
                    ) : (
                        <>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                                {formatTime(timestamp)}
                            </span>
                            {status === 'sent' && (
                                // Icons rather than '✓✓' text, which renders as
                                // different glyphs across platforms.
                                <span className={isRead ? 'text-primary' : 'text-muted-foreground/60'}>
                                    {isRead ? (
                                        <CheckCheck className="size-3.5" />
                                    ) : (
                                        <Check className="size-3.5" />
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
