'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface TimeSlot {
    date: string      // ISO date format: "2025-01-15"
    startTime: string // 24h format: "14:00"
    endTime: string   // 24h format: "15:00"
}

export default function MentorshipOnboarding({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        strengths: '',
        weaknesses: '',
        requirements: '',
        timeSlots: [] as TimeSlot[],
        anythingElse: ''
    })

    // State for the slot picker
    const [newSlot, setNewSlot] = useState<TimeSlot>({
        date: '',
        startTime: '',
        endTime: ''
    })

    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No session')

            const response = await fetch('/api/match-mentors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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

    const addTimeSlot = () => {
        if (newSlot.date && newSlot.startTime && newSlot.endTime) {
            // Validate end time is after start time
            if (newSlot.endTime <= newSlot.startTime) {
                alert('End time must be after start time')
                return
            }
            setFormData({
                ...formData,
                timeSlots: [...formData.timeSlots, { ...newSlot }]
            })
            setNewSlot({ date: '', startTime: '', endTime: '' })
        }
    }

    const removeTimeSlot = (index: number) => {
        setFormData({
            ...formData,
            timeSlots: formData.timeSlots.filter((_, i) => i !== index)
        })
    }

    const formatSlotDisplay = (slot: TimeSlot) => {
        const date = new Date(slot.date)
        const formatted = date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        })
        return `${formatted}, ${slot.startTime} - ${slot.endTime}`
    }

    // Get minimum date (tomorrow)
    const getMinDate = () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    }

    const steps = [
        {
            title: "Your Strengths",
            description: "What are you naturally good at? (e.g., Mathematics, Writing, Problem Solving)",
            field: "strengths",
            type: "text"
        },
        {
            title: "Your Weaknesses",
            description: "What areas would you like to improve? (e.g., Time Management, Exam Technique)",
            field: "weaknesses",
            type: "text"
        },
        {
            title: "Mentor Requirements",
            description: "What specific guidance are you looking for from a mentor?",
            field: "requirements",
            type: "text"
        },
        {
            title: "Your Availability",
            description: "Add at least 3 time slots when you're available for sessions",
            field: "timeSlots",
            type: "slots"
        },
        {
            title: "Anything Else?",
            description: "Is there anything else you'd like your potential mentors to know?",
            field: "anythingElse",
            type: "text"
        }
    ]

    const currentStep = steps[step - 1]

    const isStepValid = () => {
        if (currentStep.type === 'slots') {
            return formData.timeSlots.length >= 3
        }
        return ((formData as any)[currentStep.field] as string).trim() !== ''
    }

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

                    {currentStep.type === 'text' ? (
                        <textarea
                            autoFocus
                            value={(formData as any)[currentStep.field]}
                            onChange={(e) => setFormData({ ...formData, [currentStep.field]: e.target.value })}
                            className="w-full h-40 p-6 rounded-2xl border border-gray-100 bg-gray-50 shadow-inner focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none resize-none text-gray-700 text-lg"
                            placeholder="Type your response here..."
                        />
                    ) : (
                        <div className="space-y-6">
                            {/* Existing Slots */}
                            {formData.timeSlots.length > 0 && (
                                <div className="flex flex-wrap gap-3">
                                    {formData.timeSlots.map((slot, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-xl font-medium"
                                        >
                                            <span>{formatSlotDisplay(slot)}</span>
                                            <button
                                                onClick={() => removeTimeSlot(index)}
                                                className="hover:bg-accent/20 rounded-full p-1 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add New Slot Form */}
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-2">Date</label>
                                        <input
                                            type="date"
                                            min={getMinDate()}
                                            value={newSlot.date}
                                            onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-2">Start Time</label>
                                        <input
                                            type="time"
                                            value={newSlot.startTime}
                                            onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-2">End Time</label>
                                        <input
                                            type="time"
                                            value={newSlot.endTime}
                                            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={addTimeSlot}
                                    disabled={!newSlot.date || !newSlot.startTime || !newSlot.endTime}
                                    className="mt-4 w-full py-3 bg-accent/10 text-accent font-bold rounded-xl hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Time Slot
                                </button>
                            </div>

                            {/* Slot Count Indicator */}
                            <div className={`text-sm font-medium ${formData.timeSlots.length >= 3 ? 'text-green-600' : 'text-amber-600'}`}>
                                {formData.timeSlots.length >= 3
                                    ? `✓ ${formData.timeSlots.length} slots added`
                                    : `Add ${3 - formData.timeSlots.length} more slot${3 - formData.timeSlots.length > 1 ? 's' : ''}`
                                }
                            </div>
                        </div>
                    )}

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
                            disabled={loading || !isStepValid()}
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
