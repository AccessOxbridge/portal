'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, X, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/utils/lib'
import {
    ATTACHMENT_ACCEPT_ATTR,
    MAX_ATTACHMENTS_PER_MESSAGE,
    formatBytes,
    isImageMime,
    prepareImageForUpload,
    validateDocument,
    type PendingAttachment,
} from '@/lib/chat-attachments'

interface MessageInputProps {
    onSend: (content: string, attachments: PendingAttachment[]) => Promise<void>
    disabled?: boolean
    placeholder?: string
}

export default function MessageInput({
    onSend,
    disabled = false,
    placeholder = 'Type a message…',
}: MessageInputProps) {
    const [message, setMessage] = useState('')
    const [pending, setPending] = useState<PendingAttachment[]>([])
    const [isSending, setIsSending] = useState(false)
    const [isPreparing, setIsPreparing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 140) + 'px'
    }, [message])

    // Object URLs are created per preview; release them when unmounting so
    // a long chat session doesn't leak blobs.
    useEffect(() => {
        return () => {
            setPending((current) => {
                current.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl))
                return current
            })
        }
    }, [])

    const addFiles = useCallback(
        async (files: File[]) => {
            if (files.length === 0) return
            setError(null)

            const room = MAX_ATTACHMENTS_PER_MESSAGE - pending.length
            if (room <= 0) {
                setError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} items per message.`)
                return
            }

            setIsPreparing(true)
            const accepted: PendingAttachment[] = []
            let firstError: string | null = null

            for (const file of files.slice(0, room)) {
                if (isImageMime(file.type) || file.type === '') {
                    const prepared = await prepareImageForUpload(file)
                    if (!prepared.ok) {
                        firstError ??= prepared.error
                        continue
                    }
                    accepted.push({
                        id: crypto.randomUUID(),
                        file: prepared.file,
                        kind: 'image',
                        previewUrl: URL.createObjectURL(prepared.file),
                        width: prepared.width,
                        height: prepared.height,
                    })
                } else {
                    const check = validateDocument(file)
                    if (!check.ok) {
                        firstError ??= check.error
                        continue
                    }
                    accepted.push({ id: crypto.randomUUID(), file, kind: 'file' })
                }
            }

            if (files.length > room) {
                firstError ??= `Only the first ${room} file${room === 1 ? '' : 's'} were added.`
            }

            setPending((current) => [...current, ...accepted])
            setError(firstError)
            setIsPreparing(false)
        },
        [pending.length]
    )

    const removePending = (id: string) => {
        setPending((current) => {
            const target = current.find((p) => p.id === id)
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
            return current.filter((p) => p.id !== id)
        })
    }

    const canSend = (message.trim().length > 0 || pending.length > 0) && !isSending && !isPreparing && !disabled

    const handleSend = async () => {
        if (!canSend) return

        const content = message.trim()
        const attachments = pending

        setIsSending(true)
        setError(null)
        setMessage('')
        setPending([])

        try {
            await onSend(content, attachments)
            attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
        } catch {
            // Put the draft back so nothing the user typed is lost.
            setMessage(content)
            setPending(attachments)
            setError('Message could not be sent. Please try again.')
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Pasting a screenshot straight into the composer is the fastest path for
    // the thing students actually do — sharing an essay or a results page.
    const handlePaste = (e: React.ClipboardEvent) => {
        const files = Array.from(e.clipboardData.files)
        if (files.length > 0) {
            e.preventDefault()
            addFiles(files)
        }
    }

    return (
        <div
            className="shrink-0 border-t border-gray-200/70 bg-white px-3 py-3 md:px-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault()
                addFiles(Array.from(e.dataTransfer.files))
            }}
        >
          {/* Same 720px column as the thread, so the composer lines up. */}
          <div className="max-w-[720px] mx-auto w-full">
            {/* Chosen files preview above the input, removable before sending. */}
            {(pending.length > 0 || isPreparing) && (
                <div className="flex flex-wrap gap-2 mb-2.5">
                    {pending.map((item) => (
                        <div key={item.id} className="relative group">
                            {item.kind === 'image' && item.previewUrl ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 h-16 px-3 rounded-lg border border-gray-200 bg-gray-50 max-w-[200px]">
                                    <FileText className="w-4 h-4 text-accent shrink-0" />
                                    <span className="min-w-0">
                                        <span className="block text-[12px] font-medium text-gray-700 truncate">
                                            {item.file.name}
                                        </span>
                                        <span className="block text-[10px] text-gray-400">
                                            {formatBytes(item.file.size)}
                                        </span>
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => removePending(item.id)}
                                aria-label={`Remove ${item.file.name}`}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm hover:bg-black transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}

                    {isPreparing && (
                        <div className="w-16 h-16 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {error && <p className="text-[11px] text-red-500 mb-2 px-0.5">{error}</p>}

            <div className="flex items-end gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ATTACHMENT_ACCEPT_ATTR}
                    className="hidden"
                    onChange={(e) => {
                        addFiles(Array.from(e.target.files || []))
                        e.target.value = ''
                    }}
                />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isSending}
                    aria-label="Attach a photo or file"
                    // The standing hint line under the composer is gone; keep
                    // paste/drag discoverable here instead.
                    title="Attach a photo or file — you can also paste or drag one in"
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-accent hover:bg-accent/[0.06] transition-colors disabled:opacity-40"
                >
                    <Paperclip className="w-5 h-5" />
                </button>

                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={placeholder}
                    disabled={disabled || isSending}
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[15px] focus:border-accent/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all disabled:opacity-50"
                />

                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label="Send message"
                    className={cn(
                        'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all',
                        canSend
                            ? 'bg-accent text-white hover:bg-accent/90 shadow-sm'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    )}
                >
                    {isSending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
                </button>
            </div>

          </div>
        </div>
    )
}
