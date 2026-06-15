'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Save, School, Target, BookOpen, Trophy, Sparkles, Globe, Clock } from 'lucide-react'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'
import { getDefaultTimezone, rememberTimezone } from '@/lib/timezone'

interface Subject {
    name: string
    predicted_grade: string
}

interface AcademicProfile {
    id: string
    school_name: string | null
    school_country: string | null
    year_group: string | null
    curriculum: string | null
    curriculum_other: string | null
    target_university: string | null
    target_course: string | null
    subjects: Subject[]
    gcse_results: Record<string, string>
    application_year: number | null
    interests: string | null
    extracurriculars: string | null
    timezone: string | null
    additional_notes: string | null
    parent_email: string | null
    is_complete: boolean
}

interface Props {
    userId: string
    userName: string
    existingProfile: AcademicProfile | null
}

const YEAR_GROUPS = ['Year 11', 'Year 12', 'Year 13', 'Gap Year', 'University']
const TARGET_UNIVERSITIES = ['Oxford', 'Cambridge', 'Both Oxford & Cambridge', 'Other Top UK', 'US Universities', 'Undecided']
const GRADE_OPTIONS = ['A*', 'A', 'B', 'C', 'D', 'E', 'Predicted']
const CURRICULUM_OPTIONS = ['A-Level', 'IB', 'Other']

export default function AcademicProfileContent({ userId, userName, existingProfile }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const defaultTimezone = useMemo(() => getDefaultTimezone(), [])

    const ALL_SUBJECTS = useMemo(() => {
        const flat = Object.values(SUBJECT_OPTIONS).flat()
        return [...new Set(flat)].sort()
    }, [])

    const [formData, setFormData] = useState({
        school_name: existingProfile?.school_name || '',
        school_country: existingProfile?.school_country || '',
        year_group: existingProfile?.year_group || '',
        curriculum: existingProfile?.curriculum || '',
        curriculum_other: existingProfile?.curriculum_other || '',
        target_university: existingProfile?.target_university || '',
        target_course: existingProfile?.target_course || '',
        subjects: existingProfile?.subjects || [] as Subject[],
        application_year: existingProfile?.application_year || new Date().getFullYear() + 1,
        interests: existingProfile?.interests || '',
        extracurriculars: existingProfile?.extracurriculars || '',
        timezone: existingProfile?.timezone || '',
        additional_notes: existingProfile?.additional_notes || '',
        parent_email: existingProfile?.parent_email || ''
    })

    // Initialize timezone on mount
    useEffect(() => {
        if (!formData.timezone && defaultTimezone) {
            setFormData(prev => ({ ...prev, timezone: defaultTimezone }))
        }
    }, [defaultTimezone, formData.timezone])

    const [newSubject, setNewSubject] = useState({ name: '', predicted_grade: '' })

    const addSubject = () => {
        if (newSubject.name && newSubject.predicted_grade) {
            setFormData(prev => ({
                ...prev,
                subjects: [...prev.subjects, newSubject]
            }))
            setNewSubject({ name: '', predicted_grade: '' })
        }
    }

    const removeSubject = (index: number) => {
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.filter((_, i) => i !== index)
        }))
    }

    const isProfileComplete = () => {
        return (
            formData.school_name.trim() !== '' &&
            formData.school_country.trim() !== '' &&
            formData.year_group !== '' &&
            formData.curriculum !== '' &&
            (formData.curriculum !== 'Other' || formData.curriculum_other.trim() !== '') &&
            formData.target_university !== '' &&
            formData.subjects.length >= 1 &&
            formData.timezone.trim() !== '' &&
            formData.interests.trim() !== '' &&
            formData.extracurriculars.trim() !== ''
        )
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const profileData = {
                id: userId,
                ...formData,
                parent_email: formData.parent_email?.trim() || null,
                is_complete: isProfileComplete(),
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase
                .from('student_profiles')
                .upsert(profileData as any)

            if (error) throw error

            rememberTimezone(formData.timezone)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
            router.refresh()
        } catch (err) {
            console.error('Failed to save profile:', err)
            alert('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const isNew = !existingProfile

    return (
        <div className="space-y-8">
            {/* Welcome Banner for new users */}
            {isNew && (
                <div className="p-6 bg-linear-to-r from-accent to-blue-600 rounded-2xl text-white">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold mb-1">Welcome, {userName}!</h2>
                            <p className="text-white/80 text-sm leading-relaxed">
                                Complete your academic profile to help us match you with the perfect mentor.
                                The more details you provide, the better we can personalize your experience.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Basic Information */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <School className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Basic Information</h3>
                        <p className="text-sm text-gray-500">Tell us about your school</p>
                    </div>
                </div>
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                            <input
                                type="text"
                                value={formData.school_name}
                                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                placeholder="e.g., Westminster School"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">School Country</label>
                            <input
                                type="text"
                                value={formData.school_country}
                                onChange={(e) => setFormData({ ...formData, school_country: e.target.value })}
                                placeholder="e.g., United Kingdom"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Year Group</label>
                            <div className="relative">
                                <select
                                    value={formData.year_group}
                                    onChange={(e) => setFormData({ ...formData, year_group: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none appearance-none transition-all"
                                >
                                    <option value="">Select year group</option>
                                    {YEAR_GROUPS.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum</label>
                            <div className="relative">
                                <select
                                    value={formData.curriculum}
                                    onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none appearance-none transition-all"
                                >
                                    <option value="">Select curriculum</option>
                                    {CURRICULUM_OPTIONS.map(curr => (
                                        <option key={curr} value={curr}>{curr}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    {formData.curriculum === 'Other' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Specify Curriculum</label>
                            <input
                                type="text"
                                value={formData.curriculum_other}
                                onChange={(e) => setFormData({ ...formData, curriculum_other: e.target.value })}
                                placeholder="e.g., AP, National Curriculum..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* Timezone */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Timezone</h3>
                        <p className="text-sm text-gray-500">For scheduling mentorship sessions</p>
                    </div>
                </div>
                <div className="p-6">
                    <input
                        type="text"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        placeholder="e.g., Europe/London"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Tip: use an IANA timezone like <span className="font-semibold">Europe/London</span>, <span className="font-semibold">America/New_York</span>, <span className="font-semibold">Asia/Dubai</span>.
                    </p>
                </div>
            </section>

            {/* Target Goals */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Target Goals</h3>
                        <p className="text-sm text-gray-500">Where do you want to study?</p>
                    </div>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target University</label>
                        <div className="relative">
                            <select
                                value={formData.target_university}
                                onChange={(e) => setFormData({ ...formData, target_university: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none appearance-none transition-all"
                            >
                                <option value="">Select target</option>
                                {TARGET_UNIVERSITIES.map(uni => (
                                    <option key={uni} value={uni}>{uni}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Course</label>
                        <input
                            type="text"
                            value={formData.target_course}
                            onChange={(e) => setFormData({ ...formData, target_course: e.target.value })}
                            placeholder="e.g., Medicine, Law, Computer Science"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Application Year</label>
                        <input
                            type="number"
                            value={formData.application_year || ''}
                            onChange={(e) => setFormData({ ...formData, application_year: parseInt(e.target.value) || new Date().getFullYear() + 1 })}
                            min={new Date().getFullYear()}
                            max={new Date().getFullYear() + 5}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>
            </section>

            {/* Subjects */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">A-Level / IB Subjects</h3>
                        <p className="text-sm text-gray-500">Add your current subjects and predicted grades</p>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    {/* Existing Subjects */}
                    {formData.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {formData.subjects.map((subject, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium"
                                >
                                    <span>{subject.name}</span>
                                    <span className="px-1.5 py-0.5 bg-purple-200 rounded text-xs font-bold">
                                        {subject.predicted_grade}
                                    </span>
                                    <button
                                        onClick={() => removeSubject(idx)}
                                        className="ml-1 hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Subject Form */}
                    <div className="flex gap-3">
                        <input
                            list="subject-options"
                            type="text"
                            value={newSubject.name}
                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                            placeholder="Subject name"
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                        />
                        <datalist id="subject-options">
                            {ALL_SUBJECTS.map((s) => (
                                <option key={s} value={s} />
                            ))}
                        </datalist>
                        <div className="relative">
                            <select
                                value={newSubject.predicted_grade}
                                onChange={(e) => setNewSubject({ ...newSubject, predicted_grade: e.target.value })}
                                className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none appearance-none transition-all pr-10"
                            >
                                <option value="">Grade</option>
                                {GRADE_OPTIONS.map(grade => (
                                    <option key={grade} value={grade}>{grade}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                        <button
                            onClick={addSubject}
                            disabled={!newSubject.name || !newSubject.predicted_grade}
                            className="px-4 py-3 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </section>

            {/* Extra Info */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Interests & Activities</h3>
                        <p className="text-sm text-gray-500">Helps us match you with the right mentor</p>
                    </div>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Academic Interests</label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            placeholder="Topics you're curious about, areas you want to explore, books/papers you've read..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all resize-none h-24"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Extracurricular Activities</label>
                        <textarea
                            value={formData.extracurriculars}
                            onChange={(e) => setFormData({ ...formData, extracurriculars: e.target.value })}
                            placeholder="Clubs, competitions, leadership, volunteering, work experience, sports, music, projects..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all resize-none h-24"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
                        <textarea
                            value={formData.additional_notes}
                            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                            placeholder="Any constraints, preferred mentor style, deadlines, or context we should know..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all resize-none h-24"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Parent/guardian email (optional)</label>
                        <input
                            type="email"
                            value={formData.parent_email}
                            onChange={(e) => setFormData({ ...formData, parent_email: e.target.value.trim() })}
                            placeholder="e.g., parent@example.com"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                        />
                        <p className="mt-1 text-xs text-gray-500">Fortnightly progress reports can be sent to this address.</p>
                    </div>
                </div>
            </section>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-500">
                    {!isProfileComplete() && (
                        <span className="text-amber-600">
                            Complete required fields to enable mentor matching
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`inline-flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all ${saved
                        ? 'bg-green-500 text-white'
                        : 'bg-accent text-white hover:scale-[1.02] shadow-lg shadow-accent/20'
                        } disabled:opacity-50`}
                >
                    {saving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Save Profile
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
