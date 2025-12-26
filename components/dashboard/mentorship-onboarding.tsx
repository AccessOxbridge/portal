'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function MentorshipOnboarding({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        strengths: '',
        weaknesses: '',
        requirements: '',
        timeSlots: '',
        anythingElse: ''
    })
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No session')

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/match-mentors-v1`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(formData)
            })

            const result = await response.json()
            if (result.error) throw new Error(result.error)

            router.refresh()
            onClose()
        } catch (err) {
            console.error('Matching failed:', err)
            alert('Failed to find mentors. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const steps = [
        {
            title: "Your Strengths",
            description: "What are you naturally good at? (e.g., Mathematics, Writing, Problem Solving)",
            field: "strengths"
        },
        {
            title: "Your Weaknesses",
            description: "What areas would you like to improve? (e.g., Time Management, Exam Technique)",
            field: "weaknesses"
        },
        {
            title: "Mentor Requirements",
            description: "What specific guidance are you looking for from a mentor?",
            field: "requirements"
        },
        {
            title: "Availability",
            description: "When are you usually free for sessions? (e.g., Weekends, Evenings)",
            field: "timeSlots"
        },
        {
            title: "Anything Else?",
            description: "Is there anything else you'd like your potential mentors to know?",
            field: "anythingElse"
        }
    ]

    const currentStep = steps[step - 1]

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-8 sm:p-12">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <span className="text-accent font-bold text-sm tracking-wider uppercase">Step {step} of {steps.length}</span>
                            <h2 className="text-3xl font-extrabold text-gray-900 mt-1">{currentStep.title}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p className="text-gray-500 mb-6 text-lg leading-relaxed">
                        {currentStep.description}
                    </p>

                    <textarea
                        autoFocus
                        value={(formData as any)[currentStep.field]}
                        onChange={(e) => setFormData({ ...formData, [currentStep.field]: e.target.value })}
                        className="w-full h-40 p-6 rounded-2xl border border-gray-100 bg-gray-50 shadow-inner focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none resize-none text-gray-700 text-lg"
                        placeholder="Type your response here..."
                    />

                    <div className="flex justify-between mt-10">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-8 py-4 rounded-xl font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Back
                            </button>
                        ) : <div></div>}

                        <button
                            disabled={loading || !(formData as any)[currentStep.field].trim()}
                            onClick={() => step === steps.length ? handleSubmit() : setStep(step + 1)}
                            className="bg-accent text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Matching...
                                </span>
                            ) : (
                                step === steps.length ? "Find My Mentors" : "Next Step"
                            )}
                        </button>
                    </div>
                </div>

                <div className="h-2 bg-gray-100">
                    <div
                        className="h-full bg-accent transition-all duration-500 ease-out"
                        style={{ width: `${(step / steps.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
