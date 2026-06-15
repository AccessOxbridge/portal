'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'
import { getDefaultTimezone, rememberTimezone } from '@/lib/timezone'

type StepId = 'basic' | 'targets' | 'additional'

interface SubjectWithGrade {
    name: string
    predicted_grade: string
}

interface TimeSlot {
    date: string // "2025-01-15"
    startTime: string // UTC ISO string
    endTime: string // UTC ISO string
}

interface StudentOnboardingData {
    schoolName: string
    schoolCountry: string
    curriculum: '' | 'IB' | 'A-Level' | 'Other'
    curriculumOther: string
    subjects: SubjectWithGrade[]

    targetUniversities: string[]

    timezone: string
    timeSlots: TimeSlot[]
    academicInterests: string
    extracurriculars: string
    anythingElse: string
    /** Optional: parent/guardian email for fortnightly progress reports */
    parentEmail: string
}

const STORAGE_KEY = 'oxbridge.studentOnboardingDraft.v1'

const STEP_ORDER: StepId[] = ['basic', 'targets', 'additional']

const EMPTY_DATA: StudentOnboardingData = {
    schoolName: '',
    schoolCountry: '',
    curriculum: '',
    curriculumOther: '',
    subjects: [],

    targetUniversities: [],

    timezone: '',
    timeSlots: [],
    academicInterests: '',
    extracurriculars: '',
    anythingElse: '',
    parentEmail: ''
}

export default function StudentOnboardingFlow({ stepId }: { stepId: StepId }) {
    const router = useRouter()
    const stepIndex = Math.max(0, STEP_ORDER.indexOf(stepId))
    const stepNumber = stepIndex + 1
    const totalSteps = STEP_ORDER.length

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState<StudentOnboardingData>(EMPTY_DATA)

    const [newSubject, setNewSubject] = useState<SubjectWithGrade>({ name: '', predicted_grade: '' })
    const [newTargetUniversity, setNewTargetUniversity] = useState('')
    const [newSlot, setNewSlot] = useState<{ date: string; startTime: string; endTime: string }>({ date: '', startTime: '', endTime: '' })

    const defaultTimeZone = useMemo(() => getDefaultTimezone(), [])

    const ALL_SUBJECTS = useMemo(() => {
        const flat = Object.values(SUBJECT_OPTIONS).flat()
        return [...new Set(flat)].sort()
    }, [])

    // Load draft on mount
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw) as Partial<StudentOnboardingData>
            setFormData(prev => ({ ...prev, ...parsed }))
        } catch {
            // ignore
        }
    }, [])

    // Persist draft
    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
        } catch {
            // ignore
        }
    }, [formData])

    // Initialize timezone once
    useEffect(() => {
        if (!formData.timezone && defaultTimeZone) {
            setFormData(prev => ({ ...prev, timezone: defaultTimeZone }))
        }
    }, [defaultTimeZone, formData.timezone])

    const addSubject = () => {
        const name = newSubject.name.trim()
        const predicted_grade = newSubject.predicted_grade.trim()
        if (!name || !predicted_grade) return

        const exists = formData.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())
        if (exists) {
            alert('You already added that subject.')
            return
        }

        setFormData(prev => ({ ...prev, subjects: [...prev.subjects, { name, predicted_grade }] }))
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

        setFormData(prev => ({ ...prev, targetUniversities: [...prev.targetUniversities, uni] }))
        setNewTargetUniversity('')
    }

    const removeTargetUniversity = (index: number) => {
        setFormData(prev => ({ ...prev, targetUniversities: prev.targetUniversities.filter((_, i) => i !== index) }))
    }

    const addTimeSlot = () => {
        if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) return
        if (newSlot.endTime <= newSlot.startTime) {
            alert('End time must be after start time')
            return
        }

        // Store UTC ISO strings (this matches the existing mentor-side scheduling flow)
        const startDateTime = new Date(`${newSlot.date}T${newSlot.startTime}:00`)
        const endDateTime = new Date(`${newSlot.date}T${newSlot.endTime}:00`)

        setFormData(prev => ({
            ...prev,
            timeSlots: [
                ...prev.timeSlots,
                {
                    date: newSlot.date,
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                }
            ]
        }))

        setNewSlot({ date: '', startTime: '', endTime: '' })
    }

    const removeTimeSlot = (index: number) => {
        setFormData(prev => ({ ...prev, timeSlots: prev.timeSlots.filter((_, i) => i !== index) }))
    }

    const formatSlotDisplay = (slot: TimeSlot) => {
        const start = new Date(slot.startTime)
        const end = new Date(slot.endTime)

        const dateStr = start.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: formData.timezone || undefined,
        })
        const startTimeStr = start.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: formData.timezone || undefined,
        })
        const endTimeStr = end.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: formData.timezone || undefined,
        })

        return `${dateStr}, ${startTimeStr} - ${endTimeStr}`
    }

    const isStepValid = () => {
        if (stepId === 'basic') {
            const curriculumOk = formData.curriculum !== '' && (formData.curriculum !== 'Other' || formData.curriculumOther.trim() !== '')
            const subjectsOk = formData.subjects.length >= 1 && formData.subjects.every(s => s.name.trim() !== '' && s.predicted_grade.trim() !== '')
            return formData.schoolName.trim() !== '' && formData.schoolCountry.trim() !== '' && curriculumOk && subjectsOk
        }

        if (stepId === 'targets') {
            return formData.targetUniversities.length >= 1
        }

        if (stepId === 'additional') {
            const timezoneOk = formData.timezone.trim() !== ''
            const slotsOk = formData.timeSlots.length >= 3
            const interestsOk = formData.academicInterests.trim() !== ''
            const extracurricularsOk = formData.extracurriculars.trim() !== ''
            return timezoneOk && slotsOk && interestsOk && extracurricularsOk
        }

        return false
    }

    const goBack = () => {
        if (stepIndex <= 0) return
        router.push(`/dashboard/student/onboarding/${STEP_ORDER[stepIndex - 1]}`)
    }

    const goNext = () => {
        if (stepIndex >= totalSteps - 1) return
        router.push(`/dashboard/student/onboarding/${STEP_ORDER[stepIndex + 1]}`)
    }

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/match-mentors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const result = await response.json()

            if (!response.ok) {
                if (response.status === 402) {
                    setError(result.error || 'Insufficient credits to complete this booking.')
                    return
                }
                throw new Error(result.error || 'Failed to submit onboarding data.')
            }

            rememberTimezone(formData.timezone)

            try {
                window.localStorage.removeItem(STORAGE_KEY)
            } catch {
                // ignore
            }

            router.refresh()
            router.push('/dashboard/student')
        } catch (err: any) {
            console.error('Submission failed:', err)
            setError(err.message || 'An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const stepMeta = useMemo(() => {
        if (stepId === 'basic') {
            return {
                title: 'Part 1 — Basic Info',
                description: 'Tell us about your school, curriculum, and predicted grades.'
            }
        }
        if (stepId === 'targets') {
            return {
                title: 'Part 2 — Target Universities',
                description: 'Add up to 5 universities you’re targeting.'
            }
        }
        return {
            title: 'Part 3 — Additional Information',
            description: 'Share your availability, timezone, academic interests, and extracurriculars.'
        }
    }, [stepId])

    return (
        <div className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-gray-100">
            <div className="p-8 sm:p-10">
                <div className="flex items-start justify-between gap-6 mb-6">
                    <div className="min-w-0">
                        <span className="text-accent font-bold text-sm tracking-wider uppercase">
                            Step {stepNumber} of {totalSteps}
                        </span>
                        <h2 className="text-3xl font-extrabold text-gray-900 mt-1">{stepMeta.title}</h2>
                        <p className="text-gray-500 mt-3 text-lg leading-relaxed">{stepMeta.description}</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-red-900 font-bold text-lg mb-1">Something went wrong</h3>
                            <p className="text-red-700 leading-relaxed">{error}</p>
                            {error.toLowerCase().includes('credits') && (
                                <button
                                    onClick={() => router.push('/dashboard/student/services')}
                                    className="mt-4 px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                                >
                                    Get More Credits
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {stepId === 'basic' ? (
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
                                    <div className="relative">
                                        <select
                                            value={formData.curriculum}
                                            onChange={(e) => setFormData({ ...formData, curriculum: e.target.value as any })}
                                            className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none appearance-none transition-all text-gray-700"
                                        >
                                            <option value="">Select IB / A-Level / Other</option>
                                            <option value="IB">IB</option>
                                            <option value="A-Level">A-Level</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
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
                                    <p className="text-sm text-gray-500">Add at least 1.</p>
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
                ) : stepId === 'targets' ? (
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
                ) : (
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
                                        <label className="block text-sm font-bold text-gray-500 mb-2">Date</label>
                                        <input
                                            type="date"
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
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Parent/guardian email (optional)</label>
                                <input
                                    type="email"
                                    value={formData.parentEmail}
                                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value.trim() })}
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-gray-700"
                                    placeholder="e.g., parent@example.com"
                                />
                                <p className="mt-1 text-xs text-gray-500">We’ll send fortnightly progress reports to this address if provided.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between mt-10">
                    {stepIndex > 0 ? (
                        <button
                            onClick={goBack}
                            className="px-8 py-4 rounded-xl font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            type="button"
                        >
                            Back
                        </button>
                    ) : <div />}

                    <button
                        disabled={loading || !isStepValid()}
                        onClick={() => (stepIndex === totalSteps - 1 ? handleSubmit() : goNext())}
                        className="bg-accent text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        type="button"
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
                            stepIndex === totalSteps - 1 ? 'Submit For Allocation' : 'Next Step'
                        )}
                    </button>
                </div>
            </div>

            <div className="h-2 bg-gray-100">
                <div
                    className="h-full bg-accent transition-all duration-500 ease-out"
                    style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
                />
            </div>
        </div>
    )
}

