'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
    ArrowLeft,
    Mail,
    Phone,
    Calendar,
    Star,
    CheckCircle2,
    Clock,
    XCircle,
    Loader2,
    Users,
    School,
    FileText
} from 'lucide-react'

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
    active: 'bg-green-50 text-green-700 border-green-100',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-100',
    details_required: 'bg-gray-50 text-gray-700 border-gray-100'
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

            // Fetch session count
            const { count: sessionCount } = await supabase
                .from('sessions')
                .select('*', { count: 'exact', head: true })
                .eq('mentor_id', mentorId)
                .eq('status', 'completed')

            // Fetch average rating
            const { data: sessionsData } = await supabase
                .from('sessions')
                .select('id')
                .eq('mentor_id', mentorId)

            const sessionIds = sessionsData?.map(s => s.id) || []

            let avgRating: number | null = null
            if (sessionIds.length > 0) {
                const { data: feedbackData } = await supabase
                    .from('form_responses')
                    .select('rating')
                    .eq('form_type', 'student_feedback')
                    .in('session_id', sessionIds)
                    .not('rating', 'is', null)

                if (feedbackData && feedbackData.length > 0) {
                    const ratings = feedbackData.map(fb => fb.rating as number)
                    avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
                }
            }

            setMentor({
                ...mentorData,
                sessions_completed: sessionCount || 0,
                avg_rating: avgRating
            } as MentorProfile)
            setIsLoading(false)
        }

        fetchMentor()
    }, [mentorId])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        )
    }

    if (!mentor) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Mentor not found</h3>
                <Link href="/dashboard/admin/mentors" className="text-accent hover:underline mt-4">
                    ← Back to Mentors
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
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Mentors
            </Link>

            {/* Header Card */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden">
                        {mentor.photo_url ? (
                            <img src={mentor.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            mentor.profile?.full_name?.[0] || 'M'
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col mb-4">
                            <h1 className="text-2xl font-bold text-gray-900">{mentor.profile?.full_name || 'Unknown'}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                {mentor.university && (
                                    <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                                        <School className="w-4 h-4" />
                                        {mentor.university}
                                    </span>
                                )}
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[currentStatus]}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {currentStatus.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                            {mentor.profile?.email && (
                                <a href={`mailto:${mentor.profile.email}`} className="flex items-center gap-1.5 hover:text-accent transition-colors">
                                    <Mail className="w-4 h-4" />
                                    {mentor.profile.email}
                                </a>
                            )}
                            {mentor.phone && (
                                <a href={`tel:${mentor.phone}`} className="flex items-center gap-1.5 hover:text-accent transition-colors">
                                    <Phone className="w-4 h-4" />
                                    {mentor.phone}
                                </a>
                            )}
                            <span className="flex items-center gap-1.5 text-gray-400">
                                <Calendar className="w-4 h-4" />
                                Joined {format(new Date(mentor.created_at), 'MMM dd, yyyy')}
                            </span>
                        </div>

                        {mentor.cv_url && (
                            <a
                                href={mentor.cv_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors mb-4"
                            >
                                <FileText className="w-4 h-4" />
                                View CV
                            </a>
                        )}

                        {/* Stats */}
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-gray-900">{mentor.sessions_completed}</span>
                                <span className="text-sm text-gray-500">Sessions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {mentor.avg_rating ? (
                                    <>
                                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                        <span className="text-2xl font-bold text-gray-900">{mentor.avg_rating.toFixed(1)}</span>
                                        <span className="text-sm text-gray-500">/5 Rating</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-400">No ratings yet</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bio Section */}
            {mentor.bio && (
                <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Bio</h2>
                    <p className="text-gray-600 whitespace-pre-wrap">{mentor.bio}</p>
                </div>
            )}

            {/* Expertise */}
            {mentor.expertise && mentor.expertise.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Expertise</h2>
                    <div className="flex flex-wrap gap-2">
                        {mentor.expertise.map((exp) => (
                            <span key={exp} className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-sm font-medium">
                                {exp}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Onboarding Responses */}
            {mentor.responses && Object.keys(mentor.responses).length > 0 && (
                <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Onboarding Form Responses</h2>
                    <div className="space-y-6">
                        {Object.entries(mentor.responses).map(([key, value]) => (
                            <div key={key} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                <label className="block text-sm font-semibold text-gray-500 mb-2 capitalize">
                                    {key.replace(/_/g, ' ')}
                                </label>
                                <p className="text-gray-900 whitespace-pre-wrap">
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
