'use client'

import { format, isToday, isYesterday } from 'date-fns'
import RichText from './rich-text'
import AttachmentGrid from './attachment-grid'
import type { ChatAttachment } from '@/lib/chat-attachments'

interface InterventionBubbleProps {
    content: string
    timestamp: string
    attachments?: ChatAttachment[] | null
    signedUrls: Map<string, string>
    onOpenImage: (attachment: ChatAttachment) => void
}

/**
 * A third-party message from the Access Oxbridge team stepping into a
 * mentor↔student thread. Deliberately distinct from either participant's
 * bubbles so it reads as an official note rather than a reply.
 */
export default function InterventionBubble({
    content,
    timestamp,
    attachments,
    signedUrls,
    onOpenImage,
}: InterventionBubbleProps) {
    const date = new Date(timestamp)
    const time =
        isToday(date) || isYesterday(date)
            ? format(date, 'h:mm a')
            : format(date, 'MMM d, h:mm a')

    return (
        <div className="flex gap-2">
            <div className="shrink-0 mt-auto">
                <div className="w-8 h-8 rounded-full bg-white border border-accent/20 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Access Oxbridge" className="w-5 h-5 object-contain" />
                </div>
            </div>

            <div className="flex flex-col gap-1.5 max-w-[75%] sm:max-w-[70%] items-start">
                <span className="text-[11px] font-semibold text-accent ml-1">Claire Marlowe</span>

                {attachments && attachments.length > 0 && (
                    <AttachmentGrid
                        attachments={attachments}
                        signedUrls={signedUrls}
                        isSent={false}
                        onOpenImage={onOpenImage}
                    />
                )}

                {content.trim().length > 0 && (
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-accent/[0.06] border border-accent/15 text-gray-800">
                        <RichText content={content} />
                    </div>
                )}

                <span className="text-[11px] text-gray-400 px-0.5 tabular-nums">{time}</span>
            </div>
        </div>
    )
}
