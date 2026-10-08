'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, CalendarBlank as Calendar, Briefcase, ChatCircle as MessageCircle, UserCircle } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { segmentClass, segmentCount, segmentTrack } from '@/components/ui/segmented'
import { cn } from '@/utils/lib'

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
                .eq('type', 'mentor')
                .maybeSingle()  // Use maybeSingle instead of single to avoid error when no rows

            if (existingConv) {
                // Navigate to messages with existing conversation
                router.push(`/dashboard/student/messages?mentor=${mentorId}`)
                return
            }

            // Create new conversation (only if none exists)
            if (!fetchError || fetchError.code === 'PGRST116') {
                const { error: insertError } = await supabase
                    .from('conversations')
                    .insert({
                        student_id: currentUserId,
                        mentor_id: mentorId,
                        type: 'mentor'
                    })

                if (insertError) {
                    console.error('Failed to create conversation:', insertError)
                }
            }

            // Always navigate to messages page
            router.push(`/dashboard/student/messages?mentor=${mentorId}`)
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

    // The "Past" tab is only relevant once the admin has changed the student's
    // mentor at least once (i.e. there is a previous, non-current assignment).
    const hasPastMentors = pastMentors.length > 0
    const effectiveTab = activeTab === 'past' && !hasPastMentors ? 'active' : activeTab
    const mentors = effectiveTab === 'active' ? activeMentors : pastMentors

    return (
        <div className="space-y-6">
            {/* Tab Switcher */}
            <div className={segmentTrack}>
                <button
                    onClick={() => setActiveTab('active')}
                    aria-pressed={effectiveTab === 'active'}
                    className={segmentClass(effectiveTab === 'active')}
                >
                    Current
                    {activeMentors.length > 0 && (
                        <span className={cn(segmentCount, 'bg-tint-green text-tint-green-foreground')}>
                            {activeMentors.length}
                        </span>
                    )}
                </button>
                {hasPastMentors && (
                    <button
                        onClick={() => setActiveTab('past')}
                        aria-pressed={effectiveTab === 'past'}
                        className={segmentClass(effectiveTab === 'past')}
                    >
                        Past
                        <span className={cn(segmentCount, 'bg-card text-muted-foreground')}>
                            {pastMentors.length}
                        </span>
                    </button>
                )}
            </div>

            {/* Mentors List */}
            {mentors.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title={effectiveTab === 'active' ? 'No mentors assigned yet' : 'No past mentors'}
                    description={effectiveTab === 'active'
                        ? 'The Access Oxbridge team will assign your mentor(s) shortly. Once assigned, they will appear here and you can book a session.'
                        : 'If a mentor is ever unassigned, they will appear here.'}
                    className="py-16"
                />
            ) : (
                <div className="grid gap-4">
                    {mentors.map((mentor) => (
                        <div
                            key={mentor.id}
                            className="rounded-card bg-card p-5 shadow-border transition-shadow duration-150 ease-out hover:shadow-border-hover sm:p-6"
                        >
                            <div className="flex items-start gap-4">
                                {/* Mentor Avatar */}
                                <Avatar name={mentor.full_name || 'Mentor'} src={mentor.photo_url} size="xl" className="max-sm:size-12 max-sm:text-base" />

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-semibold text-foreground">
                                                {mentor.full_name}
                                            </h3>
                                            {mentor.has_active_session && (
                                                <Badge tone="green" className="mt-1">
                                                    <span className="size-1.5 rounded-full bg-success" />
                                                    Active mentorship
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                                            <Link
                                                href={`/dashboard/student/mentors/${mentor.id}`}
                                                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                                            >
                                                <UserCircle />
                                                View profile
                                            </Link>
                                            <button
                                                onClick={() => handleStartChat(mentor.id)}
                                                disabled={chatLoadingId === mentor.id}
                                                className={buttonVariants({ variant: 'brand', size: 'sm' })}
                                            >
                                                {chatLoadingId === mentor.id ? (
                                                    <Spinner className="size-4" />
                                                ) : (
                                                    <MessageCircle weight="fill" />
                                                )}
                                                Chat
                                            </button>
                                            <Link
                                                href="/dashboard/student/sessions"
                                                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                                            >
                                                <Calendar />
                                                View sessions
                                            </Link>
                                        </div>
                                    </div>

                                    {mentor.bio && (
                                        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                                            {mentor.bio}
                                        </p>
                                    )}

                                    {/* Expertise Tags */}
                                    {mentor.expertise && mentor.expertise.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {mentor.expertise.slice(0, 4).map((skill, idx) => (
                                                <Badge
                                                    key={idx}
                                                    tone="neutral"
                                                >
                                                    {skill}
                                                </Badge>
                                            ))}
                                            {mentor.expertise.length > 4 && (
                                                <Badge tone="outline">
                                                    +{mentor.expertise.length - 4} more
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground tabular-nums">
                                        <div className="flex items-center gap-1.5">
                                            <Briefcase className="size-4" />
                                            <span>{mentor.total_sessions} session{mentor.total_sessions !== 1 ? 's' : ''}</span>
                                        </div>
                                        {mentor.last_session_at && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="size-4" />
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
