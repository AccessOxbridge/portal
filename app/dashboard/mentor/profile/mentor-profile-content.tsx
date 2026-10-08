'use client'

import { useState, useMemo, useRef, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
    FloppyDisk as Save,
    User,
    Envelope as Mail,
    Phone,
    Buildings as School,
    Clock,
    Sparkle as Sparkles,
    Users,
    CalendarCheck,
    Camera,
    CheckCircle as CheckCircle2,
} from '@phosphor-icons/react/ssr'
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
            className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 text-base"
        >
            <Save className="size-5" />
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
                <div className="border border-transparent bg-card rounded-card shadow-border p-5 flex items-center gap-4">
                    <div className="size-11 bg-tint-blue rounded-control flex items-center justify-center shrink-0">
                        <CalendarCheck className="size-5 text-brand" />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-foreground leading-none">{stats.sessionsCompleted}</p>
                        <p className="text-sm text-muted-foreground mt-1">Sessions completed</p>
                    </div>
                </div>
                <div className="border border-transparent bg-card rounded-card shadow-border p-5 flex items-center gap-4">
                    <div className="size-11 bg-tint-green rounded-control flex items-center justify-center shrink-0">
                        <Users className="size-5 text-success" />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-foreground leading-none">{stats.activeStudents}</p>
                        <p className="text-sm text-muted-foreground mt-1">Active students</p>
                    </div>
                </div>
            </section>

            {/* Identity */}
            <section className="border border-transparent bg-card rounded-card shadow-border overflow-hidden">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="size-10 bg-primary/10 rounded-control flex items-center justify-center">
                        <User className="size-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Your details</h3>
                        <p className="text-sm text-muted-foreground">Name, photo and contact information</p>
                    </div>
                </div>
                <div className="p-6 space-y-5">
                    {/* Photo */}
                    <div className="flex items-center gap-5">
                        <div className="relative size-20 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-2xl shrink-0 overflow-hidden border border-border">
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
                                className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm"
                            >
                                <Camera className="size-4" />
                                {photoPreview ? 'Change photo' : 'Upload photo'}
                            </button>
                            <p className="text-xs text-muted-foreground mt-2">JPG or PNG, square works best.</p>
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
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Full name</label>
                            <input
                                type="text"
                                name="full_name"
                                value={form.full_name}
                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                placeholder="Your full name"
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 px-3.5"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full pl-10 pr-4 py-3 rounded-control border border-border bg-muted/60 text-muted-foreground outline-none cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="e.g., +44 7700 900000"
                                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 pe-3.5 pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">University</label>
                            <div className="relative">
                                <School className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    name="university"
                                    value={form.university}
                                    onChange={(e) => setForm({ ...form, university: e.target.value })}
                                    placeholder="e.g., University of Oxford"
                                    className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 pe-3.5 pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Timezone</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                name="timezone"
                                value={form.timezone}
                                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                                placeholder="e.g., Europe/London"
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 h-11 pe-3.5 pl-10"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Use an IANA timezone like <span className="font-semibold">Europe/London</span> or{' '}
                            <span className="font-semibold">America/New_York</span>. Used to show your session times.
                        </p>
                    </div>
                </div>
            </section>

            {/* Bio */}
            <section className="border border-transparent bg-card rounded-card shadow-border overflow-hidden">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="size-10 bg-tint-violet rounded-control flex items-center justify-center">
                        <Sparkles className="size-5 text-tint-violet-foreground" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">About you</h3>
                        <p className="text-sm text-muted-foreground">A short bio students will see</p>
                    </div>
                </div>
                <div className="p-6">
                    <textarea
                        name="bio"
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        rows={5}
                        placeholder="Tell students about your background, achievements, and how you like to mentor…"
                        className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 py-2.5 px-3.5 leading-relaxed resize-y"
                    />
                </div>
            </section>

            {/* Expertise */}
            <section className="border border-transparent bg-card rounded-card shadow-border overflow-hidden">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="size-10 bg-tint-green rounded-control flex items-center justify-center">
                        <CheckCircle2 className="size-5 text-success" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Areas of Expertise</h3>
                        <p className="text-sm text-muted-foreground">Subjects you can mentor students in</p>
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
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-[background-color,box-shadow,color] duration-150 ${
                                        selected
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
                                    }`}
                                >
                                    {subject}
                                </button>
                            )
                        })}
                    </div>
                    {expertise.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-3">Select at least one subject.</p>
                    )}
                </div>
            </section>

            {/* Footer / Save */}
            <div className="flex items-center justify-between gap-4 pb-4">
                <div className="min-h-[1.5rem]">
                    {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
                    {state?.success && !dirty && (
                        <p className="text-sm font-medium text-success inline-flex items-center gap-1.5">
                            <CheckCircle2 className="size-4" /> Profile saved
                        </p>
                    )}
                </div>
                <SaveButton dirty={dirty} />
            </div>
        </form>
    )
}
