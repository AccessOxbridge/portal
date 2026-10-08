'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
    ArrowLeft,
    Envelope as Mail,
    Phone,
    CalendarBlank as Calendar,
    Star,
    CheckCircle as CheckCircle2,
    Clock,
    XCircle,
    CircleNotch as Loader2,
    Users,
    Buildings as School,
    FileText,
} from '@phosphor-icons/react/ssr'
import { sortBySubjectPriority } from '@/lib/subject-priority'
import MentorRatings, { type MentorRating } from './mentor-ratings'
import { fetchMentorSessionStats } from '../actions'

interface MentorProfile {
    id: string
    bio: string | null
    expertise: string[] | null
    status: string | null
    phone: string | null
    responses: Record<string, any> | null
    created_at: string
    profile: {
        full_name: string | null
        email: string | null
    } | null
    sessions_completed: number
    avg_rating: number | null
    university: string | null
    photo_url: string | null
    cv_url: string | null
}

const statusColors: Record<string, string> = {
    active: 'bg-tint-green text-tint-green-foreground border-border',
    pending_approval: 'bg-tint-amber text-tint-amber-foreground border-border',
    details_required: 'bg-muted/60 text-foreground border-border'
}

const statusIcons: Record<string, any> = {
    active: CheckCircle2,
    pending_approval: Clock,
    details_required: XCircle
}

export default function MentorProfilePage() {
    const params = useParams()
    const mentorId = params.id as string
    const supabase = createClient()

    const [mentor, setMentor] = useState<MentorProfile | null>(null)
    const [ratings, setRatings] = useState<MentorRating[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchMentor = async () => {
            setIsLoading(true)

            const { data: mentorData, error } = await supabase
                .from('mentors')
                .select(`
                    *,
                    profile:profiles!mentors_id_fkey (
                        full_name,
                        email
                    )
                `)
                .eq('id', mentorId)
                .single()

            if (error || !mentorData) {
                setIsLoading(false)
                return
            }

            // Session counts and ratings come from a server action: this is a
            // client component, and `sessions` has no admin SELECT policy, so
            // querying it from the browser as an admin returns nothing.
            const stats = await fetchMentorSessionStats(mentorId)
            setRatings(stats.ratings)

            setMentor({
                ...mentorData,
                sessions_completed: stats.sessionsCompleted,
                avg_rating: stats.avgRating
            } as MentorProfile)
            setIsLoading(false)
        }

        fetchMentor()
    }, [mentorId])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="size-8 text-primary animate-spin" />
            </div>
        )
    }

    if (!mentor) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mb-4">
                    <Users className="size-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Mentor not found</h3>
                <Link href="/dashboard/admin/mentors" className="text-primary hover:underline mt-4">
                    ← Back to mentors
                </Link>
            </div>
        )
    }

    const currentStatus = mentor.status || 'details_required'
    const StatusIcon = statusIcons[currentStatus] || Clock

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Back Button */}
            <Link
                href="/dashboard/admin/mentors"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
                <ArrowLeft className="size-4" />
                Back to mentors
            </Link>

            {/* Header Card */}
            <div className="border border-transparent bg-card rounded-card p-8 shadow-border">
                <div className="flex items-start gap-6">
                    <div className="size-20 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-2xl shrink-0 overflow-hidden">
                        {mentor.photo_url ? (
                            <img src={mentor.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            mentor.profile?.full_name?.[0] || 'M'
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col mb-4">
                            <h1 className="text-2xl font-semibold text-foreground">{mentor.profile?.full_name || 'Unknown'}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                {mentor.university && (
                                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                                        <School className="size-4" />
                                        {mentor.university}
                                    </span>
                                )}
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[currentStatus]}`}>
                                    <StatusIcon className="size-3.5" />
                                    {currentStatus.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            {mentor.profile?.email && (
                                <a href={`mailto:${mentor.profile.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                    <Mail className="size-4" />
                                    {mentor.profile.email}
                                </a>
                            )}
                            {mentor.phone && (
                                <a href={`tel:${mentor.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                    <Phone className="size-4" />
                                    {mentor.phone}
                                </a>
                            )}
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="size-4" />
                                Joined {format(new Date(mentor.created_at), 'MMM dd, yyyy')}
                            </span>
                        </div>

                        {mentor.cv_url && (
                            <a
                                href={mentor.cv_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3 mb-4"
                            >
                                <FileText className="size-4" />
                                View CV
                            </a>
                        )}

                        {/* Stats */}
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-semibold text-foreground">{mentor.sessions_completed}</span>
                                <span className="text-sm text-muted-foreground">Sessions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {mentor.avg_rating ? (
                                    <>
                                        <Star weight="fill" className="size-5 text-amber-400 fill-amber-400" />
                                        <span className="text-2xl font-semibold text-foreground">{mentor.avg_rating.toFixed(1)}</span>
                                        <span className="text-sm text-muted-foreground">/5 rating</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-muted-foreground">No ratings yet</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student feedback — admin-only */}
            <MentorRatings ratings={ratings} sessionsCompleted={mentor.sessions_completed} />

            {/* Bio Section */}
            {mentor.bio && (
                <div className="border border-transparent bg-card rounded-card p-8 shadow-border">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Bio</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap">{mentor.bio}</p>
                </div>
            )}

            {/* Expertise */}
            {mentor.expertise && mentor.expertise.length > 0 && (
                <div className="border border-transparent bg-card rounded-card p-8 shadow-border">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Expertise</h2>
                    <div className="flex flex-wrap gap-2">
                        {sortBySubjectPriority(mentor.expertise).map((exp) => (
                            <span key={exp} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                                {exp}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Onboarding Responses */}
            {mentor.responses && Object.keys(mentor.responses).length > 0 && (
                <div className="border border-transparent bg-card rounded-card p-8 shadow-border">
                    <h2 className="text-lg font-semibold text-foreground mb-6">Onboarding form responses</h2>
                    <div className="space-y-6">
                        {Object.entries(mentor.responses).map(([key, value]) => (
                            <div key={key} className="border-b border-border pb-4 last:border-0 last:pb-0">
                                <label className="block text-sm font-semibold text-muted-foreground mb-2 capitalize">
                                    {key.replace(/_/g, ' ')}
                                </label>
                                <p className="text-foreground whitespace-pre-wrap">
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
