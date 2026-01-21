'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'

interface SubjectWithGrade {
    name: string
    predicted_grade: string
}

interface WeeklyTimeSlot {
    day: string // e.g., "Monday"
    startTime: string // 24h format: "14:00"
    endTime: string // 24h format: "15:00"
}

export default function MentorshipOnboarding({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        // Part 1: Basic Info
        schoolName: '',
        schoolCountry: '',
        curriculum: '' as '' | 'IB' | 'A-Level' | 'Other',
        curriculumOther: '',
        subjects: [] as SubjectWithGrade[],

        // Part 2: Target Universities
        targetUniversities: [] as string[],

        // Part 3: Additional Information
        timezone: '',
        timeSlots: [] as WeeklyTimeSlot[],
        academicInterests: '',
        extracurriculars: '',
        anythingElse: ''
    })

    const defaultTimeZone = useMemo(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        } catch {
            return ''
        }
    }, [])

    // Initialize timezone once (client-side)
    useEffect(() => {
        if (!formData.timezone && defaultTimeZone) {
            setFormData(prev => ({ ...prev, timezone: defaultTimeZone }))
        }
    }, [defaultTimeZone, formData.timezone])

    const [newSubject, setNewSubject] = useState<SubjectWithGrade>({ name: '', predicted_grade: '' })
    const [newTargetUniversity, setNewTargetUniversity] = useState('')
    const [newSlot, setNewSlot] = useState<WeeklyTimeSlot>({ day: '', startTime: '', endTime: '' })

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

    const addSubject = () => {
        const name = newSubject.name.trim()
        const predicted_grade = newSubject.predicted_grade.trim()
        if (!name || !predicted_grade) return

        const exists = formData.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())
        if (exists) {
            alert('You already added that subject.')
            return
        }

        setFormData(prev => ({
            ...prev,
            subjects: [...prev.subjects, { name, predicted_grade }]
        }))
        setNewSubject({ name: '', predicted_grade: '' })
    }

    const removeSubject = (index: number) => {
        setFormData(prev => ({ ...prev, subjects: prev.subjects.filter((_, i) => i !== index) }))
    }

    const addTargetUniversity = () => {
        const uni = newTargetUniversity.trim()
        if (!uni) return
        if (formData.targetUniversities.length >= 5) return

        const exists = formData.targetUniversities.some(u => u.toLowerCase() === uni.toLowerCase())
        if (exists) {
            alert('You already added that university.')
            return
        }

        setFormData(prev => ({
            ...prev,
            targetUniversities: [...prev.targetUniversities, uni]
        }))
        setNewTargetUniversity('')
    }

    const removeTargetUniversity = (index: number) => {
        setFormData(prev => ({
            ...prev,
            targetUniversities: prev.targetUniversities.filter((_, i) => i !== index)
        }))
    }

    const addTimeSlot = () => {
        if (newSlot.day && newSlot.startTime && newSlot.endTime) {
            if (newSlot.endTime <= newSlot.startTime) {
                alert('End time must be after start time')
                return
            }

            setFormData(prev => ({
                ...prev,
                timeSlots: [...prev.timeSlots, { ...newSlot }]
            }))
            setNewSlot({ day: '', startTime: '', endTime: '' })
        }
    }

    const removeTimeSlot = (index: number) => {
        setFormData({
            ...formData,
            timeSlots: formData.timeSlots.filter((_, i) => i !== index)
        })
    }

    const formatSlotDisplay = (slot: WeeklyTimeSlot) => `${slot.day}, ${slot.startTime} - ${slot.endTime}`

    const ALL_SUBJECTS = useMemo(() => {
        const flat = Object.values(SUBJECT_OPTIONS).flat()
        return [...new Set(flat)].sort()
    }, [])

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    const steps = [
        {
            title: "Part 1 — Basic Info",
            description: "Tell us about your school, curriculum, and predicted grades.",
            type: "basic"
        },
        {
            title: "Part 2 — Target Universities",
            description: "Add up to 5 universities you’re targeting.",
            type: "targets"
        },
        {
            title: "Part 3 — Additional Information",
            description: "Share your availability, timezone, academic interests, and extracurriculars.",
            type: "additional"
        }
    ]

    const currentStep = steps[step - 1]

    const isStepValid = () => {
        if (currentStep.type === 'basic') {
            const curriculumOk = formData.curriculum !== '' && (formData.curriculum !== 'Other' || formData.curriculumOther.trim() !== '')
            const subjectsOk = formData.subjects.length >= 1 && formData.subjects.every(s => s.name.trim() !== '' && s.predicted_grade.trim() !== '')
            return formData.schoolName.trim() !== '' && formData.schoolCountry.trim() !== '' && curriculumOk && subjectsOk
        }

        if (currentStep.type === 'targets') {
            return formData.targetUniversities.length >= 1
        }

        if (currentStep.type === 'additional') {
            const timezoneOk = formData.timezone.trim() !== ''
            const slotsOk = formData.timeSlots.length >= 3
            const interestsOk = formData.academicInterests.trim() !== ''
            const extracurricularsOk = formData.extracurriculars.trim() !== ''
            return timezoneOk && slotsOk && interestsOk && extracurricularsOk
        }

        return false
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

                    <div className="mb-6 rounded-2xl border border-accent/15 bg-accent/5 p-5">
                        <p className="text-sm leading-relaxed text-gray-700">
                            <span className="font-bold text-gray-900">Please fill in the form with as much detail as possible</span> so our strategists can curate the best roadmap for you.
                            Using this information, we’ll allocate you to mentors who will guide you to success.
                        </p>
                    </div>

                    {currentStep.type === 'basic' ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">School Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={formData.schoolName}
                                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-gray-700"
                                        placeholder="e.g., Westminster School"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Which country is your school in?</label>
                                    <input
                                        type="text"
                                        value={formData.schoolCountry}
                                        onChange={(e) => setFormData({ ...formData, schoolCountry: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-gray-700"
                                        placeholder="e.g., United Kingdom"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Curriculum</label>
                                        <select
                                            value={formData.curriculum}
                                            onChange={(e) => setFormData({ ...formData, curriculum: e.target.value as any })}
                                            className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-gray-700"
                                        >
                                            <option value="">Select IB / A-Level / Other</option>
                                            <option value="IB">IB</option>
                                            <option value="A-Level">A-Level</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    {formData.curriculum === 'Other' && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Which curriculum?</label>
                                            <input
                                                type="text"
                                                value={formData.curriculumOther}
                                                onChange={(e) => setFormData({ ...formData, curriculumOther: e.target.value })}
                                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-gray-700"
                                                placeholder="e.g., AP, National Curriculum..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-extrabold text-gray-900">Subjects & Predicted Grades</h3>
                                        <p className="text-sm text-gray-500">Add at least 1. Use “Predicted Grade” as it appears on your reports.</p>
                                    </div>
                                    <div className={`text-sm font-medium ${formData.subjects.length >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {formData.subjects.length >= 1 ? `✓ ${formData.subjects.length} added` : 'Add at least 1'}
                                    </div>
                                </div>

                                {formData.subjects.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.subjects.map((s, idx) => (
                                            <div
                                                key={`${s.name}-${idx}`}
                                                className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-xl font-medium"
                                            >
                                                <span className="max-w-[180px] truncate">{s.name}</span>
                                                <span className="px-2 py-0.5 rounded-lg bg-accent/15 text-accent text-sm font-bold">
                                                    {s.predicted_grade}
                                                </span>
                                                <button
                                                    onClick={() => removeSubject(idx)}
                                                    className="hover:bg-accent/20 rounded-full p-1 transition-colors"
                                                    type="button"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-500 mb-2">Subject</label>
                                            <input
                                                list="subject-options"
                                                type="text"
                                                value={newSubject.name}
                                                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                                placeholder="e.g., Mathematics"
                                            />
                                            <datalist id="subject-options">
                                                {ALL_SUBJECTS.map((s) => (
                                                    <option key={s} value={s} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-500 mb-2">Predicted Grade</label>
                                            <input
                                                type="text"
                                                value={newSubject.predicted_grade}
                                                onChange={(e) => setNewSubject({ ...newSubject, predicted_grade: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                                placeholder="e.g., A*, 7, 42/45..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addSubject}
                                        disabled={!newSubject.name.trim() || !newSubject.predicted_grade.trim()}
                                        className="mt-4 w-full py-3 bg-accent/10 text-accent font-bold rounded-xl hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Subject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : currentStep.type === 'targets' ? (
                        <div className="space-y-6">
                            {formData.targetUniversities.length > 0 && (
                                <div className="flex flex-wrap gap-3">
                                    {formData.targetUniversities.map((uni, index) => (
                                        <div
                                            key={`${uni}-${index}`}
                                            className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-xl font-medium"
                                        >
                                            <span className="max-w-[260px] truncate">{uni}</span>
                                            <button
                                                onClick={() => removeTargetUniversity(index)}
                                                className="hover:bg-accent/20 rounded-full p-1 transition-colors"
                                                type="button"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <label className="block text-sm font-bold text-gray-500 mb-2">Add a target university</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newTargetUniversity}
                                        onChange={(e) => setNewTargetUniversity(e.target.value)}
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                        placeholder="e.g., Oxford"
                                    />
                                    <button
                                        type="button"
                                        onClick={addTargetUniversity}
                                        disabled={!newTargetUniversity.trim() || formData.targetUniversities.length >= 5}
                                        className="px-5 py-3 bg-accent/10 text-accent font-bold rounded-xl hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="mt-3 text-sm text-gray-500">
                                    {formData.targetUniversities.length >= 5 ? (
                                        <span className="text-amber-600 font-medium">You’ve reached the maximum of 5 target universities.</span>
                                    ) : (
                                        <span>Add up to {5 - formData.targetUniversities.length} more.</span>
                                    )}
                                </div>
                            </div>

                            <div className={`text-sm font-medium ${formData.targetUniversities.length >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                                {formData.targetUniversities.length >= 1
                                    ? `✓ ${formData.targetUniversities.length} target${formData.targetUniversities.length > 1 ? 's' : ''} added`
                                    : 'Add at least 1 target university'}
                            </div>
                        </div>
                    ) : currentStep.type === 'additional' ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Timezone</label>
                                <input
                                    type="text"
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-gray-700"
                                    placeholder="e.g., Europe/London"
                                />
                                <p className="text-xs text-gray-500">
                                    Tip: use an IANA timezone like <span className="font-semibold">Europe/London</span>, <span className="font-semibold">America/New_York</span>, <span className="font-semibold">Asia/Dubai</span>.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-extrabold text-gray-900">Availability</h3>
                                        <p className="text-sm text-gray-500">Add at least 3 weekly slots.</p>
                                    </div>
                                    <div className={`text-sm font-medium ${formData.timeSlots.length >= 3 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {formData.timeSlots.length >= 3
                                            ? `✓ ${formData.timeSlots.length} slot${formData.timeSlots.length > 1 ? 's' : ''} added`
                                            : `Add ${3 - formData.timeSlots.length} more slot${3 - formData.timeSlots.length > 1 ? 's' : ''}`}
                                    </div>
                                </div>

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
                                                    type="button"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-500 mb-2">Day</label>
                                            <select
                                                value={newSlot.day}
                                                onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                            >
                                                <option value="">Select day</option>
                                                {DAYS.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
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
                                        disabled={!newSlot.day || !newSlot.startTime || !newSlot.endTime}
                                        className="mt-4 w-full py-3 bg-accent/10 text-accent font-bold rounded-xl hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Weekly Slot
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Academic interests (add as much detail as possible)</label>
                                    <textarea
                                        value={formData.academicInterests}
                                        onChange={(e) => setFormData({ ...formData, academicInterests: e.target.value })}
                                        className="w-full h-32 p-5 rounded-2xl border border-gray-100 bg-gray-50 shadow-inner focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none resize-none text-gray-700"
                                        placeholder="Topics you’re curious about, areas you want to explore, books/papers you’ve read, questions you want to answer..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Extracurriculars (add as much detail as possible)</label>
                                    <textarea
                                        value={formData.extracurriculars}
                                        onChange={(e) => setFormData({ ...formData, extracurriculars: e.target.value })}
                                        className="w-full h-32 p-5 rounded-2xl border border-gray-100 bg-gray-50 shadow-inner focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none resize-none text-gray-700"
                                        placeholder="Clubs, competitions, leadership, volunteering, work experience, sports, music, projects... (If none, write N/A)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Anything else?</label>
                                    <textarea
                                        value={formData.anythingElse}
                                        onChange={(e) => setFormData({ ...formData, anythingElse: e.target.value })}
                                        className="w-full h-28 p-5 rounded-2xl border border-gray-100 bg-gray-50 shadow-inner focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none resize-none text-gray-700"
                                        placeholder="Any constraints, preferred mentor style, deadlines, context we should know..."
                                    />
                                </div>
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
                                    Submitting...
                                </span>
                            ) : (
                                step === steps.length ? "Submit For Allocation" : "Next Step"
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
