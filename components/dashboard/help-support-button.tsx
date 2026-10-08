'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Lifebuoy as LifeBuoy, PaperPlaneRight as Send, CheckCircle as CheckCircle2 } from '@phosphor-icons/react/ssr'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

export default function HelpSupportButton() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Other parts of the student dashboard open this same panel rather than
    // building their own support form. The post-session feedback page does, so
    // "Contact support" there lands in Claire's thread like every other route.
    // Mirrors the `open-book-session` event the sidebar CTA uses.
    useEffect(() => {
        if (typeof window === 'undefined') return
        const handler = () => setIsOpen(true)
        window.addEventListener('open-help-support', handler)
        return () => window.removeEventListener('open-help-support', handler)
    }, [])

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
                throw new Error(data.error || "Couldn't send your message. Try again in a moment.")
            }
            setIsSent(true)
            setMessage('')
        } catch (e: any) {
            setError(e.message || 'Something went wrong')
        } finally {
            setIsSending(false)
        }
    }

    // The messages page runs full-bleed, so this fixed launcher lands on top of
    // the composer's send button. It is also redundant there: that page already
    // contains the Help & Support thread with Claire, which is exactly where
    // this button posts to.
    if (pathname?.endsWith('/messages')) return null

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Help & Support"
                data-floating-ui
                // Icon-only circle on phones (above the tab bar), a labelled pill from sm up.
                className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-100 flex size-12 items-center justify-center gap-2 rounded-full
                bg-primary text-primary-foreground shadow-overlay outline-none transition-[background-color,scale] duration-150 ease-out
                hover:bg-primary/90 active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 sm:w-auto sm:ps-4 sm:pe-5"
            >
                <LifeBuoy weight="bold" className="size-5" />
                <span className="hidden text-sm font-medium sm:inline">Help & Support</span>
            </button>

            {/* Closing by backdrop, Escape, swipe or the X all go through close(),
                so the message and sent state reset exactly as before. */}
            <Dialog open={isOpen} onOpenChange={(next) => !next && close()}>
                <DialogContent size="sm">
                    <DialogHeader className="flex items-center gap-3">
                        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary">
                            <img src="/logo.png" alt="Access Oxbridge" className="size-8 object-contain [mix-blend-mode:screen]" />
                        </span>
                        <div className="min-w-0">
                            <DialogTitle>Claire Marlowe</DialogTitle>
                            <DialogDescription className="mt-0.5">Senior Strategist</DialogDescription>
                        </div>
                    </DialogHeader>

                    <DialogBody>
                        {isSent ? (
                            <div className="flex flex-col items-center py-4 text-center">
                                <span className="mb-3 grid size-14 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                                    <CheckCircle2 weight="fill" className="size-8" />
                                </span>
                                <p className="text-base font-semibold text-foreground">Message sent!</p>
                                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                                    Our team has received your message and will get back to you shortly.
                                </p>
                                <Button variant="secondary" onClick={close} className="mt-5">
                                    Done
                                </Button>
                            </div>
                        ) : (
                            <>
                                <p className="text-base leading-relaxed text-muted-foreground text-pretty">
                                    Hi! I&apos;m here to help with anything you need, whether it&apos;s
                                    navigating the portal, questions about your application, or general
                                    support. Send me a message and I&apos;ll get back to you shortly.
                                </p>

                                <div className="mt-4">
                                    <Textarea
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
                                        aria-label="Your message"
                                        aria-invalid={error ? true : undefined}
                                        className="resize-none"
                                    />

                                    {error && (
                                        <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>
                                    )}

                                    <Button
                                        onClick={handleSend}
                                        disabled={!message.trim() || isSending}
                                        className="mt-3 w-full"
                                    >
                                        {isSending ? (
                                            <>
                                                <Spinner className="size-4" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send weight="bold" className="size-4" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}
                    </DialogBody>
                </DialogContent>
            </Dialog>
        </>
    )
}
