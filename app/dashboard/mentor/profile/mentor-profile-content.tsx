'use client'

import { useState, useMemo, useRef, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
    Save,
    User,
    Mail,
    Phone,
    School,
    Clock,
    Sparkles,
    Users,
    CalendarCheck,
    Camera,
    CheckCircle2,
} from 'lucide-react'
import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'
import { PHOTO_ACCEPT_ATTR } from '@/lib/image-upload'
import { updateMentorProfile } from './actions'

interface MentorRow {
    id: string
    bio: string | null
    expertise: string[] | null
    phone: string | null
    university: string | null
    timezone: string | null
    photo_url: string | null
}

interface Props {
    email: string
    fullName: string
    mentor: MentorRow
    stats: {
        sessionsCompleted: number
        activeStudents: number
    }
}

function SaveButton({ dirty }: { dirty: boolean }) {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending || !dirty}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Save className="w-5 h-5" />
            {pending ? 'Saving…' : 'Save Changes'}
        </button>
    )
}

export default function MentorProfileContent({ email, fullName, mentor, stats }: Props) {
    const [state, formAction] = useActionState(updateMentorProfile, null)

    const ALL_SUBJECTS = useMemo(() => {
        const flat = Object.values(SUBJECT_OPTIONS).flat()
        return [...new Set(flat)].sort()
    }, [])

    const [form, setForm] = useState({
        full_name: fullName || '',
        bio: mentor.bio || '',
        phone: mentor.phone || '',
        university: mentor.university || '',
        timezone: mentor.timezone || '',
    })
    const [expertise, setExpertise] = useState<string[]>(mentor.expertise || [])
    const [photoPreview, setPhotoPreview] = useState<string | null>(mentor.photo_url || null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // When the server confirms a new photo URL (after revalidatePath refreshes this
    // route post-save), clear the pending file so the form is no longer "dirty".
    const [committedPhotoUrl, setCommittedPhotoUrl] = useState(mentor.photo_url || null)
    if ((mentor.photo_url || null) !== committedPhotoUrl) {
        setCommittedPhotoUrl(mentor.photo_url || null)
        setPhotoFile(null)
    }

    const initial = useMemo(
        () => ({
            full_name: fullName || '',
            bio: mentor.bio || '',
            phone: mentor.phone || '',
            university: mentor.university || '',
            timezone: mentor.timezone || '',
            expertise: (mentor.expertise || []).slice().sort().join('|'),
        }),
        [fullName, mentor]
    )

    const dirty =
        photoFile !== null ||
        form.full_name !== initial.full_name ||
        form.bio !== initial.bio ||
        form.phone !== initial.phone ||
        form.university !== initial.university ||
        form.timezone !== initial.timezone ||
        expertise.slice().sort().join('|') !== initial.expertise

    const toggleExpertise = (subject: string) => {
        setExpertise((prev) =>
            prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
        )
    }

    const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
    }

    return (
        <form action={formAction} className="space-y-8">
            {/* Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <CalendarCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 leading-none">{stats.sessionsCompleted}</p>
                        <p className="text-sm text-gray-500 mt-1">Sessions completed</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 leading-none">{stats.activeStudents}</p>
                        <p className="text-sm text-gray-500 mt-1">Active students</p>
                    </div>
                </div>
            </section>

            {/* Identity */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Your Details</h3>
                        <p className="text-sm text-gray-500">Name, photo and contact information</p>
                    </div>
                </div>
                <div className="p-6 space-y-5">
                    {/* Photo */}
                    <div className="flex items-center gap-5">
                        <div className="relative w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden border border-gray-100">
                            {photoPreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                            ) : (
                                (form.full_name?.[0] || 'M').toUpperCase()
                            )}
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                <Camera className="w-4 h-4" />
                                {photoPreview ? 'Change photo' : 'Upload photo'}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">JPG or PNG, square works best.</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            name="photo"
                            accept={PHOTO_ACCEPT_ATTR}
                            onChange={onPhotoChange}
                            className="hidden"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                name="full_name"
                                value={form.full_name}
                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                placeholder="Your full name"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="e.g., +44 7700 900000"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
                            <div className="relative">
                                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="university"
                                    value={form.university}
                                    onChange={(e) => setForm({ ...form, university: e.target.value })}
                                    placeholder="e.g., University of Oxford"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                name="timezone"
                                value={form.timezone}
                                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                                placeholder="e.g., Europe/London"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Use an IANA timezone like <span className="font-semibold">Europe/London</span> or{' '}
                            <span className="font-semibold">America/New_York</span>. Used to show your session times.
                        </p>
                    </div>
                </div>
            </section>

            {/* Bio */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">About You</h3>
                        <p className="text-sm text-gray-500">A short bio students will see</p>
                    </div>
                </div>
                <div className="p-6">
                    <textarea
                        name="bio"
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        rows={5}
                        placeholder="Tell students about your background, achievements, and how you like to mentor…"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all resize-y"
                    />
                </div>
            </section>

            {/* Expertise */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Areas of Expertise</h3>
                        <p className="text-sm text-gray-500">Subjects you can mentor students in</p>
                    </div>
                </div>
                <div className="p-6">
                    {/* Hidden inputs carry the selected expertise into the form submission */}
                    {expertise.map((s) => (
                        <input key={s} type="hidden" name="expertise" value={s} />
                    ))}
                    <div className="flex flex-wrap gap-2">
                        {ALL_SUBJECTS.map((subject) => {
                            const selected = expertise.includes(subject)
                            return (
                                <button
                                    key={subject}
                                    type="button"
                                    onClick={() => toggleExpertise(subject)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                        selected
                                            ? 'bg-accent text-white border-accent'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-accent/40 hover:text-accent'
                                    }`}
                                >
                                    {subject}
                                </button>
                            )
                        })}
                    </div>
                    {expertise.length === 0 && (
                        <p className="text-xs text-gray-400 mt-3">Select at least one subject.</p>
                    )}
                </div>
            </section>

            {/* Footer / Save */}
            <div className="flex items-center justify-between gap-4 pb-4">
                <div className="min-h-[1.5rem]">
                    {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
                    {state?.success && !dirty && (
                        <p className="text-sm font-medium text-green-600 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Profile saved
                        </p>
                    )}
                </div>
                <SaveButton dirty={dirty} />
            </div>
        </form>
    )
}
