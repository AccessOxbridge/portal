'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

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
            <div className="p-6 bg-green-50 border border-green-200 rounded-[24px]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-green-800">Issue Reported Successfully</h3>
                        <p className="text-sm text-green-600">Our finance team will review your issue and get back to you soon.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-[24px]">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Contact Finance Team
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                        Spotted an issue with your payments? Missing payment, incorrect amount, or something else? Let us know and we'll investigate.
                    </p>

                    {!isOpen ? (
                        <button
                            onClick={() => setIsOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition-colors"
                        >
                            <AlertCircle className="w-4 h-4" />
                            Report a Payment Issue
                        </button>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-xl border border-amber-100">
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g., Missing payment for January sessions"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe the issue in detail..."
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                    required
                                />
                            </div>

                            {submitStatus === 'error' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {errorMessage || 'Failed to submit issue. Please try again.'}
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !subject.trim() || !description.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
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
                                    className="px-4 py-2.5 text-gray-600 font-medium hover:text-gray-800 transition-colors"
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
