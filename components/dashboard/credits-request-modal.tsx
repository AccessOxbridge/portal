'use client'

import { useEffect, useState } from 'react'
import { X, Clock, Send, CheckCircle2 } from 'lucide-react'

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
                throw new Error(data.error || 'Failed to send request')
            }
            setSuccess(true)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="credits-request-title"
                className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-amber-700" />
                        </div>
                        <div>
                            <h2 id="credits-request-title" className="text-xl font-extrabold text-gray-900">
                                {title}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {success ? (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-800">
                                Your message was sent to the Access Oxbridge team. We will email you once your
                                credits are updated.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3 bg-accent text-white font-bold rounded-2xl hover:opacity-95 transition-opacity"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label htmlFor="credits-request-message" className="block text-sm font-semibold text-gray-700 mb-2">
                                Message for admins
                            </label>
                            <textarea
                                id="credits-request-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="e.g. I would like to purchase 5 more session hours for this term."
                                rows={4}
                                maxLength={2000}
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-600 font-medium" role="alert">
                                {error}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-accent text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60"
                        >
                            <Send className="w-4 h-4" />
                            {loading ? 'Sending…' : 'Send to admins'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
