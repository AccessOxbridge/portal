'use client'

import { useEffect } from 'react'
import { X, Download } from 'lucide-react'
import { formatBytes, type ChatAttachment } from '@/lib/chat-attachments'

interface ImageLightboxProps {
    attachment: ChatAttachment
    url: string | undefined
    onClose: () => void
}

/** Full-size viewer for a chat image. Escape or backdrop click dismisses. */
export default function ImageLightbox({ attachment, url, onClose }: ImageLightboxProps) {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKeyDown)

        // Stop the thread scrolling behind the overlay.
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = previousOverflow
        }
    }, [onClose])

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={attachment.name}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col animate-in fade-in duration-150"
        >
            <div
                className="flex items-center justify-between gap-4 px-4 py-3 text-white/90"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-[11px] text-white/50">{formatBytes(attachment.size)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {url && (
                        <a
                            href={url}
                            download={attachment.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Download image"
                            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <Download className="w-5 h-5" />
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center p-4 pt-0">
                {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={url}
                        alt={attachment.name}
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                )}
            </div>
        </div>
    )
}
