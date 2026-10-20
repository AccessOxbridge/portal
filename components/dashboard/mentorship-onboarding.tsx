'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'
import { getDefaultTimezone, rememberTimezone } from '@/lib/timezone'

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

    const defaultTimeZone = useMemo(() => getDefaultTimezone(), [])

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

            rememberTimezone(formData.timezone)

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
            title: "Part 1: Basic Info",
            description: "Tell us about your school, curriculum, and predicted grades.",
            type: "basic"
        },
        {
            title: "Part 2: Target Universities",
            description: "Add up to 5 universities you’re targeting.",
            type: "targets"
        },
        {
            title: "Part 3: Additional Information",
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
            <div className="border border-transparent bg-card rounded-card w-full max-w-xl overflow-hidden shadow-border duration-300">
                <div className="p-8 sm:p-12">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <span className="text-primary font-semibold text-sm">Step {step} of {steps.length}</span>
                            <h2 className="text-3xl font-semibold text-foreground mt-1">{currentStep.title}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <svg className="size-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                        {currentStep.description}
                    </p>

                    <div className="mb-6 rounded-card border border-primary/15 bg-primary/5 p-5">
                        <p className="text-sm leading-relaxed text-foreground">
                            <span className="font-semibold text-foreground">Please fill in the form with as much detail as possible</span> so our strategists can curate the best roadmap for you.
                            Using this information, we’ll allocate you to mentors who will guide you to success.
                        </p>
                    </div>

                    {currentStep.type === 'basic' ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">School name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={formData.schoolName}
                                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                        placeholder="e.g., Westminster School"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">Which country is your school in?</label>
                                    <input
                                        type="text"
                                        value={formData.schoolCountry}
                                        onChange={(e) => setFormData({ ...formData, schoolCountry: e.target.value })}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                        placeholder="e.g., United Kingdom"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-foreground">Curriculum</label>
                                        <div className="relative">
                                            <select
                                                value={formData.curriculum}
                                                onChange={(e) => setFormData({ ...formData, curriculum: e.target.value as any })}
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5 appearance-none"
                                            >
                                                <option value="">Select IB / A-Level / Other</option>
                                                <option value="IB">IB</option>
                                                <option value="A-Level">A-Level</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    {formData.curriculum === 'Other' && (
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-foreground">Which curriculum?</label>
                                            <input
                                                type="text"
                                                value={formData.curriculumOther}
                                                onChange={(e) => setFormData({ ...formData, curriculumOther: e.target.value })}
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                                placeholder="e.g., AP, National Curriculum..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">Subjects and predicted grades</h3>
                                        <p className="text-sm text-muted-foreground">Add at least 1. Use “Predicted Grade” as it appears on your reports.</p>
                                    </div>
                                    <div className={`text-sm font-medium ${formData.subjects.length >= 1 ? 'text-success' : 'text-warning'}`}>
                                        {formData.subjects.length >= 1 ? `✓ ${formData.subjects.length} added` : 'Add at least 1'}
                                    </div>
                                </div>

                                {formData.subjects.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.subjects.map((s, idx) => (
                                            <div
                                                key={`${s.name}-${idx}`}
                                                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-control font-medium"
                                            >
                                                <span className="max-w-[180px] truncate">{s.name}</span>
                                                <span className="px-2 py-0.5 rounded-lg bg-primary/15 text-primary text-sm font-semibold">
                                                    {s.predicted_grade}
                                                </span>
                                                <button
                                                    onClick={() => removeSubject(idx)}
                                                    className="hover:bg-primary/20 rounded-full p-1 transition-colors"
                                                    type="button"
                                                >
                                                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-muted/60 rounded-card p-6 border border-border">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-foreground">Subject</label>
                                            <input
                                                list="subject-options"
                                                type="text"
                                                value={newSubject.name}
                                                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                                placeholder="e.g., Mathematics"
                                            />
                                            <datalist id="subject-options">
                                                {ALL_SUBJECTS.map((s) => (
                                                    <option key={s} value={s} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-foreground">Predicted grade</label>
                                            <input
                                                type="text"
                                                value={newSubject.predicted_grade}
                                                onChange={(e) => setNewSubject({ ...newSubject, predicted_grade: e.target.value })}
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                                placeholder="e.g., A*, 7, 42/45..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addSubject}
                                        disabled={!newSubject.name.trim() || !newSubject.predicted_grade.trim()}
                                        className="mt-4 w-full py-3 bg-primary/10 text-primary font-semibold rounded-control hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add subject
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
                                            className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-control font-medium"
                                        >
                                            <span className="max-w-[260px] truncate">{uni}</span>
                                            <button
                                                onClick={() => removeTargetUniversity(index)}
                                                className="hover:bg-primary/20 rounded-full p-1 transition-colors"
                                                type="button"
                                            >
                                                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="bg-muted/60 rounded-card p-6 border border-border">
                                <label className="mb-1.5 block text-sm font-medium text-foreground">Add a target university</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newTargetUniversity}
                                        onChange={(e) => setNewTargetUniversity(e.target.value)}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5 flex-1"
                                        placeholder="e.g., Oxford"
                                    />
                                    <button
                                        type="button"
                                        onClick={addTargetUniversity}
                                        disabled={!newTargetUniversity.trim() || formData.targetUniversities.length >= 5}
                                        className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-tint-blue text-tint-blue-foreground hover:bg-tint-blue/70 h-11 px-5 text-base"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="mt-3 text-sm text-muted-foreground">
                                    {formData.targetUniversities.length >= 5 ? (
                                        <span className="text-warning font-medium">You’ve reached the maximum of 5 target universities.</span>
                                    ) : (
                                        <span>Add up to {5 - formData.targetUniversities.length} more.</span>
                                    )}
                                </div>
                            </div>

                            <div className={`text-sm font-medium ${formData.targetUniversities.length >= 1 ? 'text-success' : 'text-warning'}`}>
                                {formData.targetUniversities.length >= 1
                                    ? `✓ ${formData.targetUniversities.length} target${formData.targetUniversities.length > 1 ? 's' : ''} added`
                                    : 'Add at least 1 target university'}
                            </div>
                        </div>
                    ) : currentStep.type === 'additional' ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-foreground">Timezone</label>
                                <input
                                    type="text"
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                    placeholder="e.g., Europe/London"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Tip: use an IANA timezone like <span className="font-semibold">Europe/London</span>, <span className="font-semibold">America/New_York</span>, <span className="font-semibold">Asia/Dubai</span>.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">Availability</h3>
                                        <p className="text-sm text-muted-foreground">Add at least 3 weekly slots.</p>
                                    </div>
                                    <div className={`text-sm font-medium ${formData.timeSlots.length >= 3 ? 'text-success' : 'text-warning'}`}>
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
                                                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-control font-medium"
                                            >
                                                <span>{formatSlotDisplay(slot)}</span>
                                                <button
                                                    onClick={() => removeTimeSlot(index)}
                                                    className="hover:bg-primary/20 rounded-full p-1 transition-colors"
                                                    type="button"
                                                >
                                                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-muted/60 rounded-card p-6 border border-border">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-foreground">Day</label>
                                            <div className="relative">
                                                <select
                                                    value={newSlot.day}
                                                    onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                                                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5 appearance-none"
                                                >
                                                    <option value="">Select day</option>
                                                    {DAYS.map(d => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-foreground">Start time</label>
                                            <input
                                                type="time"
                                                value={newSlot.startTime}
                                                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-foreground">End time</label>
                                            <input
                                                type="time"
                                                value={newSlot.endTime}
                                                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addTimeSlot}
                                        disabled={!newSlot.day || !newSlot.startTime || !newSlot.endTime}
                                        className="mt-4 w-full py-3 bg-primary/10 text-primary font-semibold rounded-control hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add weekly slot
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">Academic interests (add as much detail as possible)</label>
                                    <textarea
                                        value={formData.academicInterests}
                                        onChange={(e) => setFormData({ ...formData, academicInterests: e.target.value })}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 py-2.5 px-3.5 leading-relaxed h-32 resize-none"
                                        placeholder="Topics you’re curious about, areas you want to explore, books/papers you’ve read, questions you want to answer..."
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">Extracurriculars (add as much detail as possible)</label>
                                    <textarea
                                        value={formData.extracurriculars}
                                        onChange={(e) => setFormData({ ...formData, extracurriculars: e.target.value })}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 py-2.5 px-3.5 leading-relaxed h-32 resize-none"
                                        placeholder="Clubs, competitions, leadership, volunteering, work experience, sports, music, projects... (If none, write N/A)"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">Anything else?</label>
                                    <textarea
                                        value={formData.anythingElse}
                                        onChange={(e) => setFormData({ ...formData, anythingElse: e.target.value })}
                                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 py-2.5 px-3.5 leading-relaxed h-28 resize-none"
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
                                className="px-8 py-4 rounded-control font-semibold text-muted-foreground hover:text-muted-foreground transition-colors"
                            >
                                Back
                            </button>
                        ) : <div></div>}

                        <button
                            disabled={loading || !isStepValid()}
                            onClick={() => step === steps.length ? handleSubmit() : setStep(step + 1)}
                            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 text-base"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin size-5 text-white" fill="none" viewBox="0 0 24 24">
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

                <div className="h-2 bg-muted">
                    <div
                        className="h-full bg-primary transition-[background-color,box-shadow,color] duration-150 duration-500 ease-out"
                        style={{ width: `${(step / steps.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
