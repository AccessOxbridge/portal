'use client'

import { FileText, Download, ImageOff } from 'lucide-react'
import { cn } from '@/utils/lib'
import { formatBytes, type ChatAttachment } from '@/lib/chat-attachments'

/**
 * Attachments render *outside* the text bubble — bubbles are for words.
 * This follows the pattern used by Teams, LinkedIn and Missive: photos become
 * bare rounded thumbnails, documents become a distinct card, so at a glance
 * you can tell an image from a file without reading anything.
 */

interface AttachmentGridProps {
    attachments: ChatAttachment[]
    /** path -> signed URL. Missing entries render as a placeholder. */
    signedUrls: Map<string, string>
    isSent: boolean
    onOpenImage: (attachment: ChatAttachment) => void
}

export default function AttachmentGrid({
    attachments,
    signedUrls,
    isSent,
    onOpenImage,
}: AttachmentGridProps) {
    const images = attachments.filter((a) => a.kind === 'image')
    const files = attachments.filter((a) => a.kind !== 'image')

    return (
        <div className={cn('flex flex-col gap-2', isSent ? 'items-end' : 'items-start')}>
            {images.length > 0 && (
                <div
                    className={cn(
                        'grid gap-1.5 max-w-[300px]',
                        images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                    )}
                >
                    {images.map((image) => {
                        const url = signedUrls.get(image.path)

                        // A single image keeps its real proportions; grids get
                        // square tiles so the layout stays tidy.
                        const single = images.length === 1
                        const ratio =
                            single && image.width && image.height
                                ? `${image.width} / ${image.height}`
                                : '1 / 1'

                        return (
                            <button
                                key={image.path}
                                type="button"
                                onClick={() => url && onOpenImage(image)}
                                disabled={!url}
                                style={{ aspectRatio: ratio }}
                                className={cn(
                                    'relative overflow-hidden rounded-xl bg-gray-100 border border-black/5',
                                    'transition-transform hover:scale-[1.01] active:scale-100',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                                    single && 'max-h-[320px]'
                                )}
                            >
                                {url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={url}
                                        alt={image.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="absolute inset-0 flex items-center justify-center text-gray-300">
                                        <ImageOff className="w-5 h-5" />
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            {files.map((file) => {
                const url = signedUrls.get(file.path)

                return (
                    <a
                        key={file.path}
                        href={url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={file.name}
                        className={cn(
                            'group flex items-center gap-3 max-w-[300px] w-full px-3 py-2.5 rounded-xl border transition-colors',
                            url
                                ? 'bg-white border-gray-200 hover:border-accent/40 hover:bg-accent/[0.03]'
                                : 'bg-gray-50 border-gray-100 pointer-events-none opacity-60'
                        )}
                    >
                        <span className="shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                            <FileText className="w-4.5 h-4.5 text-accent" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-gray-800 truncate">
                                {file.name}
                            </span>
                            <span className="block text-[11px] text-gray-400">
                                {formatBytes(file.size)}
                            </span>
                        </span>
                        <Download className="shrink-0 w-4 h-4 text-gray-300 group-hover:text-accent transition-colors" />
                    </a>
                )
            })}
        </div>
    )
}
