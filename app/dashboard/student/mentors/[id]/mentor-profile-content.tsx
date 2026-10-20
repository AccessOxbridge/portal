'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
    ArrowLeft,
    CalendarBlank as Calendar,
    Buildings as School,
    FileText,
    ChatCircle as MessageCircle,
    Briefcase,
    Clock,
} from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

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
        <div className="space-y-5">
            <Link
                href="/dashboard/student/mentors"
                className="inline-flex items-center gap-1.5 rounded-full py-1 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                Back to My mentors
            </Link>

            {/* Header Card */}
            <div className="rounded-card bg-card p-5 shadow-border sm:p-8">
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:gap-6">
                    <Avatar name={mentor.full_name || 'Mentor'} src={mentor.photo_url} size="xl" className="size-20 text-2xl" />

                    <div className="flex-1 min-w-0">
                        <div className="mb-4 flex flex-col">
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">{mentor.full_name}</h1>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {mentor.university && (
                                    <span className="me-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <School className="size-4" />
                                        {mentor.university}
                                    </span>
                                )}
                                {isCurrent && (
                                    <Badge tone="green">
                                        <span className="size-1.5 rounded-full bg-success" />
                                        Current mentor
                                    </Badge>
                                )}
                                {!isCurrent && (
                                    <Badge tone="neutral">
                                        Past mentor
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleStartChat}
                                disabled={chatLoading}
                                className={buttonVariants({ variant: 'brand' })}
                            >
                                {chatLoading ? (
                                    <Spinner className="size-4" />
                                ) : (
                                    <MessageCircle weight="fill" />
                                )}
                                Message
                            </button>
                            <Link
                                href="/dashboard/student/sessions"
                                className={buttonVariants({ variant: 'secondary' })}
                            >
                                <Calendar />
                                View sessions
                            </Link>
                            {mentor.cv_url && (
                                <a
                                    href={mentor.cv_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonVariants({ variant: 'outline' })}
                                >
                                    <FileText />
                                    View CV
                                </a>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-4 text-sm text-muted-foreground tabular-nums">
                            <div className="flex items-center gap-1.5">
                                <Briefcase className="size-4" />
                                <span>{totalSessions} session{totalSessions !== 1 ? 's' : ''} together</span>
                            </div>
                            {lastSessionAt && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="size-4" />
                                    <span>Last session: {formatDate(lastSessionAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bio Section */}
            <div className="rounded-card bg-card p-5 shadow-border sm:p-8">
                <h2 className="mb-3 text-base font-semibold text-foreground">About</h2>
                {mentor.bio ? (
                    <p className="max-w-prose whitespace-pre-wrap leading-relaxed text-muted-foreground text-pretty">{mentor.bio}</p>
                ) : (
                    <p className="text-muted-foreground">No bio provided yet.</p>
                )}
            </div>

            {/* Expertise */}
            {mentor.expertise && mentor.expertise.length > 0 && (
                <div className="rounded-card bg-card p-5 shadow-border sm:p-8">
                    <h2 className="mb-3 text-base font-semibold text-foreground">Expertise</h2>
                    <div className="flex flex-wrap gap-2">
                        {mentor.expertise.map((exp) => (
                            <Badge key={exp} tone="blue" size="lg">
                                {exp}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
