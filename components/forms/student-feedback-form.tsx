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

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-8 sm:p-12">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <span className="text-accent font-bold text-sm tracking-wider uppercase">
                                Step {step} of {fields.length} (Optional)
                            </span>
                            <h2 className="text-3xl font-extrabold text-gray-900 mt-1">
                                {currentField.label}
                            </h2>
                        </div>
                        <button onClick={handleSkip} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    )
}
