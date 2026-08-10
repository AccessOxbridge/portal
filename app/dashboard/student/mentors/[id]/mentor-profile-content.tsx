'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
    ArrowLeft,
    Calendar,
    School,
    FileText,
    MessageCircle,
    Briefcase,
    Clock,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface MentorDetail {
    id: string
    full_name: string
    bio: string | null
    expertise: string[]
    university: string | null
    photo_url: string | null
    cv_url: string | null
}

interface StudentMentorProfileContentProps {
    mentor: MentorDetail
    isCurrent: boolean
    totalSessions: number
    hasActiveSession: boolean
    lastSessionAt: string | null
    currentUserId: string
}

export default function StudentMentorProfileContent({
    mentor,
    isCurrent,
    totalSessions,
    hasActiveSession,
    lastSessionAt,
    currentUserId,
}: StudentMentorProfileContentProps) {
    const router = useRouter()
    const supabase = createClient()
    const [chatLoading, setChatLoading] = useState(false)

    const handleStartChat = async () => {
        setChatLoading(true)
        try {
            const { data: existingConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('student_id', currentUserId)
                .eq('mentor_id', mentor.id)
                .eq('type', 'mentor')
                .maybeSingle()

            if (!existingConv) {
                await supabase.from('conversations').insert({
                    student_id: currentUserId,
                    mentor_id: mentor.id,
                    type: 'mentor',
                })
            }

            router.push(`/dashboard/student/messages?mentor=${mentor.id}`)
        } catch (error) {
            console.error('Failed to start chat:', error)
            router.push('/dashboard/student/messages')
        } finally {
            setChatLoading(false)
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A'
        return format(new Date(dateString), 'd MMM yyyy')
    }

    return (
        <div className="space-y-8">
            <Link
                href="/dashboard/student/mentors"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to My Mentors
            </Link>

            {/* Header Card */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-accent text-white flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden">
                        {mentor.photo_url ? (
                            <img src={mentor.photo_url} alt={mentor.full_name} className="w-full h-full object-cover" />
                        ) : (
                            mentor.full_name?.[0] || 'M'
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col mb-4">
                            <h1 className="text-2xl font-bold text-gray-900">{mentor.full_name}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                {mentor.university && (
                                    <span className="flex items-center gap-1.5 text-gray-600 font-medium text-sm">
                                        <School className="w-4 h-4" />
                                        {mentor.university}
                                    </span>
                                )}
                                {isCurrent && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        Current Mentor
                                    </span>
                                )}
                                {!isCurrent && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">
                                        Past Mentor
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleStartChat}
                                disabled={chatLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {chatLoading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <MessageCircle className="w-4 h-4" />
                                )}
                                Message
                            </button>
                            <Link
                                href="/dashboard/student/sessions"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent font-semibold rounded-xl hover:bg-accent/20 transition-colors text-sm"
                            >
                                <Calendar className="w-4 h-4" />
                                View Sessions
                            </Link>
                            {mentor.cv_url && (
                                <a
                                    href={mentor.cv_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                                >
                                    <FileText className="w-4 h-4" />
                                    View CV
                                </a>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                <span>{totalSessions} session{totalSessions !== 1 ? 's' : ''} together</span>
                            </div>
                            {lastSessionAt && (
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>Last session: {formatDate(lastSessionAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bio Section */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">About</h2>
                {mentor.bio ? (
                    <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{mentor.bio}</p>
                ) : (
                    <p className="text-gray-400 italic">No bio provided yet.</p>
                )}
            </div>

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
        </div>
    )
}
