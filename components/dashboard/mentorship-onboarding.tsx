'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'

interface TimeSlot {
    date: string      // ISO date format: "2025-01-15"
    startTime: string // 24h format: "14:00"
    endTime: string   // 24h format: "15:00"
}

export default function MentorshipOnboarding({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        strengths: [] as string[],
        weaknesses: '',
        requirements: '',
        timeSlots: [] as TimeSlot[],
        anythingElse: ''
    })

    // State for subject dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
            // Validate end time is after start time (local string comparison is enough for basic check)
            if (newSlot.endTime <= newSlot.startTime) {
                alert('End time must be after start time')
                return
            }

            // Normalize to UTC
            // We construct a date object using the local date and time strings
            const startDateTime = new Date(`${newSlot.date}T${newSlot.startTime}:00`)
            const endDateTime = new Date(`${newSlot.date}T${newSlot.endTime}:00`)

            setFormData({
                ...formData,
                timeSlots: [
                    ...formData.timeSlots,
                    {
                        date: newSlot.date,
                        startTime: startDateTime.toISOString(), // Store as UTC ISO
                        endTime: endDateTime.toISOString()     // Store as UTC ISO
                    }
                ]
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
        // Parse the UTC ISO strings
        const start = new Date(slot.startTime)
        const end = new Date(slot.endTime)

        const dateStr = start.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        })
        const startTimeStr = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        const endTimeStr = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

        return `${dateStr}, ${startTimeStr} - ${endTimeStr}`
    }

    // Get minimum date (tomorrow)
    const getMinDate = () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    }

    // Toggle subject selection
    const toggleSubject = (subject: string) => {
        setFormData(prev => ({
            ...prev,
            strengths: prev.strengths.includes(subject)
                ? prev.strengths.filter(s => s !== subject)
                : [...prev.strengths, subject]
        }))
    }

    // Filter subjects based on search query
    const getFilteredOptions = () => {
        if (!searchQuery.trim()) return SUBJECT_OPTIONS
        const query = searchQuery.toLowerCase()
        const filtered: Record<string, string[]> = {}
        Object.entries(SUBJECT_OPTIONS).forEach(([category, subjects]) => {
            const matchingSubjects = subjects.filter(s => s.toLowerCase().includes(query))
            if (matchingSubjects.length > 0) {
                filtered[category] = matchingSubjects
            }
        })
        return filtered
    }

    const steps = [
        {
            title: "Your Subjects",
            description: "Select the subjects you'd like help with (select at least 1)",
            field: "strengths",
            type: "multiselect"
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
        if (currentStep.type === 'multiselect') {
            return formData.strengths.length >= 1
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
                    ) : currentStep.type === 'multiselect' ? (
                        <div className="space-y-4">
                            {/* Selected subjects display */}
                            {formData.strengths.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.strengths.map((subject) => (
                                        <div
                                            key={subject}
                                            className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-xl text-sm font-medium"
                                        >
                                            <span className="truncate max-w-[200px]">{subject}</span>
                                            <button
                                                onClick={() => toggleSubject(subject)}
                                                className="hover:bg-accent/20 rounded-full p-0.5 transition-colors flex-shrink-0"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Dropdown selector */}
                            <div ref={dropdownRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white text-left flex items-center justify-between hover:border-accent/50 transition-colors"
                                >
                                    <span className="text-gray-500">
                                        {formData.strengths.length === 0
                                            ? 'Click to select subjects...'
                                            : `${formData.strengths.length} subject${formData.strengths.length > 1 ? 's' : ''} selected`}
                                    </span>
                                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-10 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 max-h-80 overflow-hidden">
                                        {/* Search input */}
                                        <div className="p-3 border-b border-gray-100 sticky top-0 bg-white">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search subjects..."
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-accent focus:bg-white outline-none text-sm"
                                                autoFocus
                                            />
                                        </div>

                                        {/* Groups */}
                                        <div className="overflow-y-auto max-h-60">
                                            {Object.entries(getFilteredOptions()).map(([category, subjects]) => (
                                                <div key={category}>
                                                    <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0">
                                                        {category}
                                                    </div>
                                                    {subjects.map((subject) => (
                                                        <button
                                                            key={subject}
                                                            type="button"
                                                            onClick={() => toggleSubject(subject)}
                                                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent/5 flex items-center gap-3 transition-colors ${formData.strengths.includes(subject) ? 'bg-accent/10 text-accent' : 'text-gray-700'
                                                                }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${formData.strengths.includes(subject) ? 'bg-accent border-accent' : 'border-gray-300'
                                                                }`}>
                                                                {formData.strengths.includes(subject) && (
                                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <span>{subject}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                            {Object.keys(getFilteredOptions()).length === 0 && (
                                                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                                    No subjects found matching "{searchQuery}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selection count */}
                            <div className={`text-sm font-medium ${formData.strengths.length >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                                {formData.strengths.length >= 1
                                    ? `✓ ${formData.strengths.length} subject${formData.strengths.length > 1 ? 's' : ''} selected`
                                    : 'Select at least 1 subject'}
                            </div>
                        </div>
                    ) : currentStep.type === 'slots' ? (
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
                    ) : null}

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
