'use client'

import { useEffect, useState } from 'react'
import { X, Clock, PaperPlaneRight as Send, CheckCircle as CheckCircle2 } from '@phosphor-icons/react/ssr'
import { sheet } from '@/components/ui/sheet-classes'
import { buttonVariants } from '@/components/ui/button'
import { fieldBase } from '@/components/ui/input'
import { cn } from '@/utils/lib'

export type CreditsRequestReason = 'booking' | 'topup'

interface CreditsRequestModalProps {
    isOpen: boolean
    onClose: () => void
    reason: CreditsRequestReason
    credits: number
}

export default function CreditsRequestModal({
    isOpen,
    onClose,
    reason,
    credits,
}: CreditsRequestModalProps) {
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            setMessage('')
            setError(null)
            setSuccess(false)
            setLoading(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const isLow = credits <= 0
    const title =
        reason === 'booking' && isLow
            ? 'Low on session hours'
            : isLow
              ? 'Out of session hours'
              : 'Request more hours'

    const subtitle =
        reason === 'booking' && isLow
            ? 'You need session credits before you can book. Send a message to our team and we will get back to you.'
            : isLow
              ? 'You have no hours remaining. Contact our admins to add credits to your account.'
              : 'Need more mentoring time? Tell our team how many hours you would like and we will help.'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = message.trim()
        if (!trimmed) {
            setError('Please enter a short message for the team.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/student/request-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed, reason }),
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "Couldn't send your request. Try again in a moment.")
            }
            setSuccess(true)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong. Try again in a moment.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={sheet.root}>
            <div
                className={sheet.overlay}
                onClick={onClose}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="credits-request-title"
                className={cn(sheet.panel, 'overflow-y-auto overscroll-contain sm:max-w-md')}
            >
                <div className={sheet.handle}><span className={sheet.handleBar} /></div>
                <div className={sheet.header}>
                    <div className="flex items-start gap-3.5">
                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                            <Clock weight="duotone" className="size-6" />
                        </div>
                        <div>
                            <h2 id="credits-request-title" className={sheet.title}>
                                {title}
                            </h2>
                            <p className={sheet.description}>{subtitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={sheet.close}
                        aria-label="Close"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {success ? (
                    <div className="space-y-4 px-6 pb-6">
                        <div role="status" className="flex items-start gap-3 rounded-card bg-tint-green p-4">
                            <CheckCircle2 weight="fill" className="mt-0.5 size-5 shrink-0 text-success" />
                            <p className="text-sm text-tint-green-foreground text-pretty">
                                Your message was sent to the Access Oxbridge team. We will email you once your
                                credits are updated.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(buttonVariants(), 'w-full')}
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
                        <div>
                            <label htmlFor="credits-request-message" className={sheet.label}>
                                Message for admins
                            </label>
                            <textarea
                                id="credits-request-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="e.g. I would like to purchase 5 more session hours for this term."
                                rows={4}
                                maxLength={2000}
                                className={cn(fieldBase, 'resize-none px-3.5 py-2.5 leading-relaxed')}
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(buttonVariants(), 'w-full')}
                        >
                            <Send weight="fill" />
                            {loading ? 'Sending…' : 'Send to admins'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
