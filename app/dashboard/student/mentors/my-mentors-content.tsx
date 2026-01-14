'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Calendar, Briefcase, MessageCircle, ArrowRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Mentor {
    id: string
    full_name: string
    bio: string | null
    expertise: string[]
    photo_url: string | null
    has_active_session: boolean
    total_sessions: number
    last_session_at: string | null
}

interface MyMentorsContentProps {
    activeMentors: Mentor[]
    pastMentors: Mentor[]
    currentUserId: string
}

export default function MyMentorsContent({
    activeMentors,
    pastMentors,
    currentUserId
}: MyMentorsContentProps) {
    const router = useRouter()
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')
    const [chatLoadingId, setChatLoadingId] = useState<string | null>(null)

    const handleStartChat = async (mentorId: string) => {
        setChatLoadingId(mentorId)
        try {
            // Check if conversation already exists
            const { data: existingConv, error: fetchError } = await supabase
                .from('conversations')
                .select('id')
                .eq('student_id', currentUserId)
                .eq('mentor_id', mentorId)
                .maybeSingle()  // Use maybeSingle instead of single to avoid error when no rows

            if (existingConv) {
                // Navigate to messages with existing conversation
                router.push('/dashboard/student/messages')
                return
            }

            // Create new conversation (only if none exists)
            if (!fetchError || fetchError.code === 'PGRST116') {
                const { error: insertError } = await supabase
                    .from('conversations')
                    .insert({
                        student_id: currentUserId,
                        mentor_id: mentorId
                    })

                if (insertError) {
                    console.error('Failed to create conversation:', insertError)
                }
            }

            // Always navigate to messages page
            router.push('/dashboard/student/messages')
        } catch (error) {
            console.error('Failed to start chat:', error)
            // Still navigate even on error
            router.push('/dashboard/student/messages')
        } finally {
            setChatLoadingId(null)
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const mentors = activeTab === 'active' ? activeMentors : pastMentors

    return (
        <div className="space-y-8">
            {/* Tab Switcher */}
            <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'active'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Connected
                    {activeMentors.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                            {activeMentors.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'past'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Past
                    {pastMentors.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                            {pastMentors.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Mentors List */}
            {mentors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {activeTab === 'active' ? 'No connected mentors' : 'No past mentors'}
                    </h3>
                    <p className="text-gray-500 max-w-sm">
                        {activeTab === 'active'
                            ? 'When you get matched with a mentor and have an active session, they will appear here.'
                            : 'Your previously connected mentors will appear here after your sessions end.'}
                    </p>
                    {activeTab === 'active' && (
                        <Link
                            href="/dashboard/student"
                            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                        >
                            Find a Mentor
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid gap-6">
                    {mentors.map((mentor) => (
                        <div
                            key={mentor.id}
                            className={`p-6 bg-white rounded-2xl border shadow-lg transition-all hover:shadow-xl ${mentor.has_active_session
                                ? 'border-green-200 shadow-green-100/50'
                                : 'border-gray-100 shadow-gray-100/50'
                                }`}
                        >
                            <div className="flex items-start gap-5">
                                {/* Mentor Avatar */}
                                {mentor.photo_url ? (
                                    <img
                                        src={mentor.photo_url}
                                        alt={mentor.full_name}
                                        className="w-16 h-16 rounded-2xl object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center text-xl font-bold shrink-0">
                                        {mentor.full_name?.[0] || 'M'}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">
                                                {mentor.full_name}
                                            </h3>
                                            {mentor.has_active_session && (
                                                <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                    Active Mentorship
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleStartChat(mentor.id)}
                                                disabled={chatLoadingId === mentor.id}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {chatLoadingId === mentor.id ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <MessageCircle className="w-4 h-4" />
                                                )}
                                                Chat
                                            </button>
                                            <Link
                                                href="/dashboard/student/sessions"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent font-semibold rounded-xl hover:bg-accent/20 transition-colors text-sm"
                                            >
                                                <Calendar className="w-4 h-4" />
                                                View Sessions
                                            </Link>
                                        </div>
                                    </div>

                                    {mentor.bio && (
                                        <p className="mt-3 text-gray-600 text-sm leading-relaxed line-clamp-2">
                                            {mentor.bio}
                                        </p>
                                    )}

                                    {/* Expertise Tags */}
                                    {mentor.expertise && mentor.expertise.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {mentor.expertise.slice(0, 4).map((skill, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                            {mentor.expertise.length > 4 && (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                                                    +{mentor.expertise.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" />
                                            <span>{mentor.total_sessions} session{mentor.total_sessions !== 1 ? 's' : ''}</span>
                                        </div>
                                        {mentor.last_session_at && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>Last: {formatDate(mentor.last_session_at)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
