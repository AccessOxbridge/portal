'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { MENTOR_REPORT_FORM, FormField } from '@/config/forms.config'
import { toast } from '@/components/ui/toaster'

interface MentorReportFormProps {
    sessionId: string
    onClose?: () => void
}

export default function MentorReportForm({ sessionId, onClose }: MentorReportFormProps) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Record<string, string | number>>({})
    const router = useRouter()
    const supabase = createClient()

    const fields = MENTOR_REPORT_FORM.fields
    const currentField = fields[step - 1]

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Submit form response
            const { error } = await supabase.from('form_responses').insert({
                session_id: sessionId,
                form_type: 'mentor_report',
                respondent_id: user.id,
                responses: formData
            })

            if (error) throw error

            // Trigger personalized report generation
            await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            })

            router.push('/dashboard/mentor')
            router.refresh()
        } catch (err) {
            console.error('Failed to submit report:', err)
            toast.error("Couldn't send your report. Try again in a moment.")
        } finally {
            setLoading(false)
        }
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
                        className="w-full h-40 rounded-control border border-input bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none resize-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
                                className={`size-14 rounded-control text-xl font-semibold tabular-nums outline-none transition-[background-color,color] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/40 ${formData[field.id] === rating
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
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
                                className={`h-11 rounded-full px-5 font-medium outline-none transition-[background-color,color] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/40 ${formData[field.id] === option
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/70'
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
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
            <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-sheet bg-card text-card-foreground shadow-overlay sm:max-h-none sm:overflow-hidden sm:rounded-sheet">
                <div className="p-5 sm:p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <span className="text-sm font-medium text-muted-foreground tabular-nums">
                                Step {step} of {fields.length}
                            </span>
                            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground text-balance">
                                {currentField.label}
                            </h2>
                        </div>
                        {onClose && (
                            <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40">
                                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {currentField.description && (
                        <p className="mb-6 text-base leading-relaxed text-muted-foreground text-pretty">
                            {currentField.description}
                        </p>
                    )}

                    <div className="flex min-h-40 items-center justify-center">
                        {renderField(currentField)}
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="h-11 rounded-full px-5 font-medium text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
                            >
                                Back
                            </button>
                        ) : <div></div>}

                        <button
                            disabled={loading || !isStepValid()}
                            onClick={() => step === fields.length ? handleSubmit() : setStep(step + 1)}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-primary-foreground outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-primary/90 enabled:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="size-4 animate-spin [animation-duration:600ms]" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting
                                </span>
                            ) : (
                                step === fields.length ? "Submit report" : "Next"
                            )}
                        </button>
                    </div>
                </div>

                <div className="h-1.5 bg-muted">
                    <div
                        className="h-full bg-primary transition-[width] duration-300 ease-out"
                        style={{ width: `${(step / fields.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
