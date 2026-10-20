'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PaperPlaneRight as Send, Paperclip, X, FileText, CircleNotch as Loader2 } from '@phosphor-icons/react/ssr'
import { cn } from '@/utils/lib'
import FormatToolbar, { applyCommand, commandForEvent, type FormatCommand } from './format-toolbar'
import RichComposer, { serializeEditor } from './rich-composer'
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
    // The container carries the focus ring now that the field is borderless.
    const [isFocused, setIsFocused] = useState(false)

    const editorRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    // Run a formatting command, then read the editor back out — the command
    // mutates the DOM directly, so state has to catch up to it.
    const runCommand = (command: FormatCommand) => {
        const el = editorRef.current
        if (!el) return
        applyCommand(command, el)
        setMessage(serializeEditor(el))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const command = commandForEvent(e)
        if (!command) return
        e.preventDefault()
        runCommand(command)
    }

    return (
        <div
            className="shrink-0 border-t border-border bg-card px-4 py-3 md:px-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault()
                addFiles(Array.from(e.dataTransfer.files))
            }}
        >
          {/* Full pane width, matching the thread above.
              One bordered container holding everything — attachment chips,
              the field and the controls — the way Slack, n8n, Cursor and
              ManyChat all do it. Free-floating icon buttons either side of a
              separate input is what made this look unfinished. */}
          <div
            className={cn(
                'w-full rounded-card border bg-card transition-colors',
                isFocused ? 'border-primary/40 ring-2 ring-primary/10' : 'border-border'
            )}
          >
            {/* Chosen files sit inside the box, above the field. */}
            {(pending.length > 0 || isPreparing) && (
                <div className="flex flex-wrap gap-2 p-2.5 pb-0">
                    {pending.map((item) => (
                        <div key={item.id} className="relative group">
                            {item.kind === 'image' && item.previewUrl ? (
                                <div className="size-16 rounded-lg overflow-hidden border border-border bg-muted/60">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 h-16 px-3 rounded-lg border border-border bg-muted/60 max-w-[200px]">
                                    <FileText className="size-4 text-primary shrink-0" />
                                    <span className="min-w-0">
                                        <span className="block text-[12px] font-medium text-foreground truncate">
                                            {item.file.name}
                                        </span>
                                        <span className="block text-[10px] text-muted-foreground">
                                            {formatBytes(item.file.size)}
                                        </span>
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => removePending(item.id)}
                                aria-label={`Remove ${item.file.name}`}
                                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-white flex items-center justify-center shadow-border hover:bg-black transition-colors"
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                    ))}

                    {isPreparing && (
                        <div className="size-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                            <Loader2 className="size-4 text-muted-foreground/60 animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {error && <p className="text-[11px] text-destructive px-3.5 pt-2.5">{error}</p>}

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

            {/* Borderless field — the container above owns the border, so the
                field and the controls read as one control. */}
            <div onKeyDown={handleKeyDown}>
                <RichComposer
                    editorRef={editorRef}
                    value={message}
                    onChange={setMessage}
                    onSend={handleSend}
                    placeholder={placeholder}
                    disabled={disabled || isSending}
                    onFocusChange={setIsFocused}
                    onFiles={addFiles}
                />
            </div>

            {/* One row of controls: formatting on the left, send pinned right.
                Keeping the marks here rather than in a strip of their own means
                the composer never gets taller than it already was. */}
            <div className="flex items-center justify-between gap-1 px-2 pb-2">
              <div className="flex items-center gap-1 min-w-0">
                <FormatToolbar onCommand={runCommand} disabled={disabled || isSending} />

                <span className="shrink-0 w-px h-4 bg-muted" />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isSending}
                    aria-label="Attach a photo or file"
                    // The standing hint line under the composer is gone; keep
                    // paste/drag discoverable here instead.
                    title="Attach a photo or file. You can also paste or drag one in"
                    className="shrink-0 size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-colors disabled:opacity-40"
                >
                    <Paperclip className="w-[18px] h-[18px]" />
                </button>
              </div>

              <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  aria-label="Send message"
                  className={cn(
                      'shrink-0 size-8 rounded-lg flex items-center justify-center transition-[background-color,box-shadow,color] duration-150',
                      canSend
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground/60 cursor-not-allowed'
                  )}
              >
                  {isSending ? (
                      <Loader2 className="size-4 animate-spin" />
                  ) : (
                      <Send className="size-4" />
                  )}
              </button>
            </div>

          </div>
        </div>
    )
}
