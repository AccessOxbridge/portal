'use client'

import { useState } from 'react'
import { WarningCircle as AlertCircle, CheckCircle, CircleNotch as Loader2 } from '@phosphor-icons/react/ssr'

interface ReportIssueFormProps {
    mentorId: string
}

export default function ReportIssueForm({ mentorId }: ReportIssueFormProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [subject, setSubject] = useState('')
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!subject.trim() || !description.trim()) return

        setIsSubmitting(true)
        setSubmitStatus('idle')
        setErrorMessage('')

        try {
            const response = await fetch('/api/user-issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    issue_type: 'payment',
                    subject: subject.trim(),
                    description: description.trim(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit issue')
            }

            setSubmitStatus('success')
            setSubject('')
            setDescription('')

            // Reset after 3 seconds
            setTimeout(() => {
                setSubmitStatus('idle')
                setIsOpen(false)
            }, 3000)
        } catch (error) {
            console.error('Error submitting issue:', error)
            setSubmitStatus('error')
            setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (submitStatus === 'success') {
        return (
            <div className="p-6 bg-tint-green border border-border rounded-card">
                <div className="flex items-center gap-3">
                    <div className="size-10 bg-tint-green rounded-full flex items-center justify-center">
                        <CheckCircle className="size-5 text-success" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-tint-green-foreground">Issue reported</h3>
                        <p className="text-sm text-success">Our finance team will review your issue and get back to you soon.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-card bg-tint-amber p-5 ring-1 ring-tint-amber-foreground/15 sm:p-6">
            <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-tint-amber-foreground">
                    <AlertCircle weight="duotone" className="size-6" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                        Contact the finance team
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        Spotted an issue with your payments? Missing payment, incorrect amount, or something else? Let us know and we'll investigate.
                    </p>

                    {!isOpen ? (
                        <button
                            onClick={() => setIsOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-warning text-white font-semibold rounded-control hover:bg-warning/90 transition-colors"
                        >
                            <AlertCircle className="size-4" />
                            Report a Payment Issue
                        </button>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-4 rounded-control border border-border">
                            <div>
                                <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-foreground">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g., Missing payment for January sessions"
                                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-foreground">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe the issue in detail..."
                                    rows={4}
                                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 py-2.5 px-3.5 leading-relaxed resize-none"
                                    required
                                />
                            </div>

                            {submitStatus === 'error' && (
                                <div className="p-3 bg-tint-rose border border-border rounded-lg text-sm text-destructive">
                                    {errorMessage || 'Failed to submit issue. Please try again.'}
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !subject.trim() || !description.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-warning text-white font-semibold rounded-control hover:bg-warning/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Issue'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false)
                                        setSubject('')
                                        setDescription('')
                                        setSubmitStatus('idle')
                                    }}
                                    className="px-4 py-2.5 text-muted-foreground font-medium hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
