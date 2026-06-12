'use client'

import { useState } from 'react'
import { LifeBuoy, X, Send, CheckCircle2 } from 'lucide-react'

export default function HelpSupportButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const close = () => {
        setIsOpen(false)
        // Reset state after the close animation finishes.
        setTimeout(() => {
            setMessage('')
            setIsSent(false)
            setError(null)
        }, 200)
    }

    const handleSend = async () => {
        const trimmed = message.trim()
        if (!trimmed || isSending) return

        setIsSending(true)
        setError(null)
        try {
            const res = await fetch('/api/student/help', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || 'Failed to send your message')
            }
            setIsSent(true)
            setMessage('')
        } catch (e: any) {
            setError(e.message || 'Something went wrong')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Help & Support"
                className="fixed bottom-6 right-6 z-100 group flex items-center gap-2 px-5 py-3 rounded-2xl
                bg-accent text-white shadow-2xl shadow-accent/30 transition-all duration-300
                hover:scale-[1.03] active:scale-[0.97]"
            >
                <LifeBuoy className="w-5 h-5" />
                <span className="font-bold text-sm hidden sm:inline">Help & Support</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={close}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-accent to-blue-600 px-6 pt-6 pb-8 text-white">
                            <button
                                onClick={close}
                                aria-label="Close"
                                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden">
                                    <img src="/logo.png" alt="Access Oxbridge" className="w-10 h-10 object-contain" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold leading-tight">Claire Marlowe</h2>
                                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                                        Senior Strategist
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">
                            {isSent ? (
                                <div className="flex flex-col items-center text-center py-4">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                                    <p className="font-semibold text-gray-900">Message sent!</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Our team has received your message and will get back to you shortly.
                                    </p>
                                    <button
                                        onClick={close}
                                        className="mt-5 px-5 py-2.5 rounded-xl bg-gray-50 text-gray-700 text-sm font-semibold transition-colors hover:bg-gray-100"
                                    >
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Hi! I&apos;m here to help with anything you need — whether it&apos;s
                                        navigating the portal, questions about your application, or general
                                        support. Send me a message and I&apos;ll get back to you shortly.
                                    </p>

                                    <div className="mt-4">
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                    e.preventDefault()
                                                    handleSend()
                                                }
                                            }}
                                            rows={4}
                                            maxLength={2000}
                                            autoFocus
                                            placeholder="Type your message..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm
                                            text-gray-900 placeholder:text-gray-400 resize-none transition-colors
                                            focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                                        />

                                        {error && (
                                            <p className="mt-2 text-xs text-red-500">{error}</p>
                                        )}

                                        <button
                                            onClick={handleSend}
                                            disabled={!message.trim() || isSending}
                                            className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl
                                            bg-accent text-white text-sm font-semibold transition-colors hover:bg-accent/90
                                            disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSending ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Send Message
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
