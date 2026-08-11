'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { cn } from '@/utils/lib'
import RichText from './rich-text'
import AttachmentGrid from './attachment-grid'
import type { ChatAttachment } from '@/lib/chat-attachments'

interface InterventionBubbleProps {
    content: string
    timestamp: string
    attachments?: ChatAttachment[] | null
    signedUrls: Map<string, string>
    onOpenImage: (attachment: ChatAttachment) => void
    isFirstInGroup?: boolean
}

/**
 * The Access Oxbridge team stepping into a mentor↔student thread.
 *
 * Reads as an incoming message like any other — same avatar/name/plain-text
 * shape — with identity carried by the logo, the accent-coloured name and a
 * quiet role tag. The previous bordered card shouted for attention; a calm
 * treatment actually reads as more official, not less.
 */
export default function InterventionBubble({
    content,
    timestamp,
    attachments,
    signedUrls,
    onOpenImage,
    isFirstInGroup = true,
}: InterventionBubbleProps) {
    const date = new Date(timestamp)
    const time =
        isToday(date) || isYesterday(date)
            ? format(date, 'h:mm a')
            : format(date, 'MMM d, h:mm a')

    const hasText = content.trim().length > 0
    const hasAttachments = !!attachments && attachments.length > 0

    return (
        <div className="flex gap-2.5">
            <div className="w-8 shrink-0">
                {isFirstInGroup && (
                    <div className="w-8 h-8 rounded-full bg-white border border-accent/20 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Access Oxbridge" className="w-5 h-5 object-contain" />
                    </div>
                )}
            </div>

            <div className="min-w-0 max-w-[85%]">
                {isFirstInGroup && (
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-accent">Claire Marlowe</span>
                        <span className="px-1.5 py-px rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                            Access Oxbridge
                        </span>
                        <span className="text-[11px] text-gray-400 tabular-nums">{time}</span>
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
                        <RichText content={content} />
                    </div>
                )}
            </div>
        </div>
    )
}
