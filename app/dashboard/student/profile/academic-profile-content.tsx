'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { FloppyDisk as Save, Buildings as School, Target, BookOpen, Trophy, Sparkle as Sparkles, Globe, Clock, Check } from '@phosphor-icons/react/ssr'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'
import { getDefaultTimezone, rememberTimezone } from '@/lib/timezone'
import DatePicker from '@/components/dashboard/date-picker'
import { buttonVariants } from '@/components/ui/button'
import { fieldBase } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/utils/lib'
import { toast } from '@/components/ui/toaster'

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
    entrance_exam_date: string | null
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

// Same generic placeholder date used by the dashboard's Application Timeline
// widget when a student hasn't set their own entrance exam date yet.
const defaultEntranceExamDate = (applicationYear: number) => {
    const date = new Date(applicationYear, 9, 20) // October 20
    return date.toISOString().slice(0, 10) // YYYY-MM-DD for <input type="date">
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
        entrance_exam_date: existingProfile?.entrance_exam_date
            || defaultEntranceExamDate(existingProfile?.application_year || new Date().getFullYear() + 1),
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
            toast.error('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const isNew = !existingProfile

    return (
        <div className="space-y-8">
            {/* Welcome Banner for new users */}
            {isNew && (
                <div className="rounded-card bg-tint-blue p-5 ring-1 ring-brand/15 sm:p-6">
                    <div className="flex items-start gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-brand">
                            <Sparkles weight="fill" className="size-6" />
                        </div>
                        <div>
                            <h2 className="mb-1 text-lg font-semibold text-foreground">Welcome, {userName}!</h2>
                            <p className="text-sm leading-relaxed text-tint-blue-foreground text-pretty">
                                Complete your academic profile to help us match you with the perfect mentor.
                                The more details you provide, the better we can personalize your experience.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Basic Information */}
            <section className="overflow-hidden rounded-card bg-card shadow-border">
                <div className="flex items-center gap-3.5 border-b border-border px-5 py-4 sm:px-6">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                        <School weight="duotone" className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Basic information</h3>
                        <p className="text-sm text-muted-foreground">Tell us about your school</p>
                    </div>
                </div>
                <div className="space-y-5 p-5 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={label}>School name</label>
                            <input
                                type="text"
                                value={formData.school_name}
                                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                placeholder="e.g., Westminster School"
                                className={field}
                            />
                        </div>
                        <div>
                            <label className={label}>School country</label>
                            <input
                                type="text"
                                value={formData.school_country}
                                onChange={(e) => setFormData({ ...formData, school_country: e.target.value })}
                                placeholder="e.g., United Kingdom"
                                className={field}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={label}>Year group</label>
                            <SelectField
                                value={formData.year_group}
                                onChange={(e) => setFormData({ ...formData, year_group: e.target.value })}
                            >
                                <option value="">Select year group</option>
                                {YEAR_GROUPS.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </SelectField>
                        </div>
                        <div>
                            <label className={label}>Curriculum</label>
                            <SelectField
                                value={formData.curriculum}
                                onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })}
                            >
                                <option value="">Select curriculum</option>
                                {CURRICULUM_OPTIONS.map(curr => (
                                    <option key={curr} value={curr}>{curr}</option>
                                ))}
                            </SelectField>
                        </div>
                    </div>
                    {formData.curriculum === 'Other' && (
                        <div>
                            <label className={label}>Specify curriculum</label>
                            <input
                                type="text"
                                value={formData.curriculum_other}
                                onChange={(e) => setFormData({ ...formData, curriculum_other: e.target.value })}
                                placeholder="e.g., AP, National Curriculum..."
                                className={field}
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* Timezone */}
            <section className="overflow-hidden rounded-card bg-card shadow-border">
                <div className="flex items-center gap-3.5 border-b border-border px-5 py-4 sm:px-6">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-violet text-tint-violet-foreground">
                        <Globe weight="duotone" className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Timezone</h3>
                        <p className="text-sm text-muted-foreground">For scheduling mentorship sessions</p>
                    </div>
                </div>
                <div className="p-5 sm:p-6">
                    <input
                        type="text"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        placeholder="e.g., Europe/London"
                        className={field}
                    />
                    <p className="mt-2 text-sm text-muted-foreground">
                        Tip: use an IANA timezone like <span className="font-medium text-foreground">Europe/London</span>, <span className="font-medium text-foreground">America/New_York</span>, <span className="font-medium text-foreground">Asia/Dubai</span>.
                    </p>
                </div>
            </section>

            {/* Target Goals */}
            <section className="overflow-hidden rounded-card bg-card shadow-border">
                <div className="flex items-center gap-3.5 border-b border-border px-5 py-4 sm:px-6">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                        <Target weight="duotone" className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Target goals</h3>
                        <p className="text-sm text-muted-foreground">Where do you want to study?</p>
                    </div>
                </div>
                <div className="space-y-5 p-5 sm:p-6">
                    <div>
                        <label className={label}>Target university</label>
                        <SelectField
                            value={formData.target_university}
                            onChange={(e) => setFormData({ ...formData, target_university: e.target.value })}
                        >
                            <option value="">Select target</option>
                            {TARGET_UNIVERSITIES.map(uni => (
                                <option key={uni} value={uni}>{uni}</option>
                            ))}
                        </SelectField>
                    </div>
                    <div>
                        <label className={label}>Target course</label>
                        <input
                            type="text"
                            value={formData.target_course}
                            onChange={(e) => setFormData({ ...formData, target_course: e.target.value })}
                            placeholder="e.g., Medicine, Law, Computer Science"
                            className={field}
                        />
                    </div>
                    <div>
                        <label className={label}>Application year</label>
                        <input
                            type="number"
                            value={formData.application_year || ''}
                            onChange={(e) => setFormData({ ...formData, application_year: parseInt(e.target.value) || new Date().getFullYear() + 1 })}
                            min={new Date().getFullYear()}
                            max={new Date().getFullYear() + 5}
                            className={field}
                        />
                    </div>
                    <div>
                        <label className={label}>Entrance exam date</label>
                        <DatePicker
                            value={formData.entrance_exam_date}
                            onChange={(value) => setFormData({ ...formData, entrance_exam_date: value })}
                        />
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Shown on your dashboard timeline. Defaults to a general date. Change it if you know your actual exam date (e.g. UCAT/BMAT/MAT).
                        </p>
                    </div>
                </div>
            </section>

            {/* Subjects */}
            <section className="overflow-hidden rounded-card bg-card shadow-border">
                <div className="flex items-center gap-3.5 border-b border-border px-5 py-4 sm:px-6">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-rose text-tint-rose-foreground">
                        <BookOpen weight="duotone" className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">A-Level / IB Subjects</h3>
                        <p className="text-sm text-muted-foreground">Add your current subjects and predicted grades</p>
                    </div>
                </div>
                <div className="space-y-4 p-5 sm:p-6">
                    {/* Existing Subjects */}
                    {formData.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {formData.subjects.map((subject, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 rounded-full bg-tint-rose py-1.5 ps-3.5 pe-1.5 text-sm font-medium text-tint-rose-foreground"
                                >
                                    <span>{subject.name}</span>
                                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold tabular-nums">
                                        {subject.predicted_grade}
                                    </span>
                                    <button
                                        onClick={() => removeSubject(idx)}
                                        className="grid size-7 place-items-center rounded-full transition-colors hover:bg-white/70"
                                        aria-label={`Remove ${subject.name}`}
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
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                        <input
                            list="subject-options"
                            type="text"
                            value={newSubject.name}
                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                            placeholder="Subject name"
                            className={cn(field, 'flex-1')}
                        />
                        <datalist id="subject-options">
                            {ALL_SUBJECTS.map((s) => (
                                <option key={s} value={s} />
                            ))}
                        </datalist>
                        <SelectField
                            value={newSubject.predicted_grade}
                            onChange={(e) => setNewSubject({ ...newSubject, predicted_grade: e.target.value })}
                            className="w-28 shrink-0"
                        >
                            <option value="">Grade</option>
                            {GRADE_OPTIONS.map(grade => (
                                <option key={grade} value={grade}>{grade}</option>
                            ))}
                        </SelectField>
                        <button
                            onClick={addSubject}
                            disabled={!newSubject.name || !newSubject.predicted_grade}
                            className={buttonVariants({ variant: 'secondary' })}
                        >
                            Add
                        </button>
                    </div>
                </div>
            </section>

            {/* Extra Info */}
            <section className="overflow-hidden rounded-card bg-card shadow-border">
                <div className="flex items-center gap-3.5 border-b border-border px-5 py-4 sm:px-6">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-amber text-tint-amber-foreground">
                        <Trophy weight="duotone" className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Interests & activities</h3>
                        <p className="text-sm text-muted-foreground">Helps us match you with the right mentor</p>
                    </div>
                </div>
                <div className="space-y-5 p-5 sm:p-6">
                    <div>
                        <label className={label}>Academic interests</label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            placeholder="Topics you're curious about, areas you want to explore, books/papers you've read..."
                            className={cn(fieldBase, 'h-24 resize-none px-3.5 py-2.5 leading-relaxed')}
                        />
                    </div>
                    <div>
                        <label className={label}>Extracurricular activities</label>
                        <textarea
                            value={formData.extracurriculars}
                            onChange={(e) => setFormData({ ...formData, extracurriculars: e.target.value })}
                            placeholder="Clubs, competitions, leadership, volunteering, work experience, sports, music, projects..."
                            className={cn(fieldBase, 'h-24 resize-none px-3.5 py-2.5 leading-relaxed')}
                        />
                    </div>
                    <div>
                        <label className={label}>Additional notes (optional)</label>
                        <textarea
                            value={formData.additional_notes}
                            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                            placeholder="Any constraints, preferred mentor style, deadlines, or context we should know..."
                            className={cn(fieldBase, 'h-24 resize-none px-3.5 py-2.5 leading-relaxed')}
                        />
                    </div>
                    <div>
                        <label className={label}>Parent/guardian email (optional)</label>
                        <input
                            type="email"
                            value={formData.parent_email}
                            onChange={(e) => setFormData({ ...formData, parent_email: e.target.value.trim() })}
                            placeholder="e.g., parent@example.com"
                            className={field}
                        />
                        <p className="mt-1.5 text-sm text-muted-foreground">Fortnightly progress reports can be sent to this address.</p>
                    </div>
                </div>
            </section>

            {/* Save Button */}
            <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    {!isProfileComplete() && (
                        <span className="text-warning">
                            Complete required fields to enable mentor matching
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(buttonVariants(), saved && 'bg-success hover:bg-success')}
                >
                    {saving ? (
                        <>
                            <Spinner className="size-4" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <Check weight="bold" className="size-4" />
                            Saved
                        </>
                    ) : (
                        <>
                            <Save weight="fill" />
                            Save profile
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

const field = cn(fieldBase, 'h-11 px-3.5')
const label = 'mb-1.5 block text-sm font-medium text-foreground'
