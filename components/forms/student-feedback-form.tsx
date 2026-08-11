'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { STUDENT_FEEDBACK_FORM, FormField } from '@/config/forms.config'

interface StudentFeedbackFormProps {
    sessionId: string
    onClose?: () => void
}

export default function StudentFeedbackForm({ sessionId, onClose }: StudentFeedbackFormProps) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Record<string, string | number>>({})
    const router = useRouter()
    const supabase = createClient()

    const fields = STUDENT_FEEDBACK_FORM.fields
    const currentField = fields[step - 1]

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase.from('form_responses').insert({
                session_id: sessionId,
                form_type: 'student_feedback',
                respondent_id: user.id,
                responses: formData
            })

            if (error) throw error

            router.push('/dashboard/student')
            router.refresh()
        } catch (err) {
            console.error('Failed to submit feedback:', err)
            alert('Failed to submit feedback. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleSkip = () => {
        router.push('/dashboard/student')
    }

    const isStepValid = () => {
        if (!currentField.required) return true
        const value = formData[currentField.id]
        if (currentField.type === 'rating') return typeof value === 'number' && value > 0
        return typeof value === 'string' && value.trim() !== ''
    }

    const renderField = (field: FormField) => {
        switch (field.type) {
            case 'textarea':
            case 'text':
                return (
                    <textarea
                        autoFocus
                        value={(formData[field.id] as string) || ''}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="w-full h-40 p-6 rounded-2xl border border-gray-100 bg-gray-50 shadow-inner focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none resize-none text-gray-700 text-lg"
                        placeholder="Type your response here..."
                    />
                )
            case 'rating':
                return (
                    <div className="flex gap-4 justify-center">
                        {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                                key={rating}
                                type="button"
                                onClick={() => setFormData({ ...formData, [field.id]: rating })}
                                className={`w-14 h-14 rounded-xl text-xl font-bold transition-all ${formData[field.id] === rating
                                    ? 'bg-accent text-white scale-110 shadow-lg shadow-accent/30'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                {rating}
                            </button>
                        ))}
                    </div>
                )
            case 'select':
                return (
                    <div className="flex flex-wrap gap-3 justify-center">
                        {field.options?.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setFormData({ ...formData, [field.id]: option })}
                                className={`px-6 py-3 rounded-xl font-medium transition-all ${formData[field.id] === option
                                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )
            default:
                return null
        }
    }

    const [helpMessage, setHelpMessage] = useState('')
    const [helpLoading, setHelpLoading] = useState(false)
    const [helpSent, setHelpSent] = useState(false)

    // ... (existing state)

    const handleHelpSubmit = async () => {
        if (!helpMessage.trim()) return
        setHelpLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase.from('user_issues').insert({
                reporter_id: user.id,
                reporter_type: 'student',
                issue_type: 'student_help',
                subject: 'Help Request from Feedback Page',
                description: helpMessage,
                status: 'open',
                priority: 'normal'
            })

            if (error) throw error

            setHelpSent(true)
            setHelpMessage('')
        } catch (err) {
            console.error('Failed to submit help request:', err)
            alert('Failed to submit help request. Please try again.')
        } finally {
            setHelpLoading(false)
        }
    }

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">

                {/* Left Column: Help Section */}
                <div className="lg:sticky lg:top-10 space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">
                            Experiencing an issue?
                        </h1>
                        <h2 className="text-2xl font-semibold text-gray-700">
                            Contact a success manager.
                        </h2>
                        <p className="text-gray-500 text-lg leading-relaxed">
                            Please enter as much information as possible and we'll get it sorted right way.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                        {!helpSent ? (
                            <>
                                <textarea
                                    value={helpMessage}
                                    onChange={(e) => setHelpMessage(e.target.value)}
                                    placeholder="Describe your issue here..."
                                    className="w-full h-48 p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-white transition-all outline-none resize-none text-gray-700"
                                />
                                <button
                                    onClick={handleHelpSubmit}
                                    disabled={helpLoading || !helpMessage.trim()}
                                    className="w-full bg-red-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-red-500"
                                >
                                    {helpLoading ? 'Sending...' : 'Contact Support'}
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-10 space-y-4">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Message Sent!</h3>
                                <p className="text-gray-500">
                                    We've received your message and a success manager will be in touch shortly.
                                </p>
                                <button
                                    onClick={() => setHelpSent(false)}
                                    className="text-accent font-medium hover:underline"
                                >
                                    Send another message
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Feedback Form */}
                <div className="bg-white rounded-[32px] w-full overflow-hidden shadow-xl border border-gray-100">
                    <div className="p-5 sm:p-12">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <span className="text-accent font-bold text-sm tracking-wider uppercase">
                                    Step {step} of {fields.length} (Optional)
                                </span>
                                <h2 className="text-3xl font-extrabold text-gray-900 mt-1">
                                    {currentField.label}
                                </h2>
                            </div>
                            <button onClick={handleSkip} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {currentField.description && (
                            <p className="text-gray-500 mb-6 text-lg leading-relaxed">
                                {currentField.description}
                            </p>
                        )}

                        <div className="min-h-[160px] flex items-center justify-center">
                            {renderField(currentField)}
                        </div>

                        <div className="flex justify-between mt-10">
                            {step > 1 ? (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="px-8 py-4 rounded-xl font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Back
                                </button>
                            ) : (
                                <button
                                    onClick={handleSkip}
                                    className="px-8 py-4 rounded-xl font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Skip
                                </button>
                            )}

                            <button
                                disabled={loading || !isStepValid()}
                                onClick={() => step === fields.length ? handleSubmit() : setStep(step + 1)}
                                className="bg-accent text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting...
                                    </span>
                                ) : (
                                    step === fields.length ? "Submit Feedback" : "Next"
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="h-2 bg-gray-100">
                        <div
                            className="h-full bg-accent transition-all duration-500 ease-out"
                            style={{ width: `${(step / fields.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
