'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarBlank as Calendar, CheckCircle as CheckCircle2, XCircle } from '@phosphor-icons/react/ssr'
import { handleMentorshipRequest } from '@/lib/actions/mentorship-requests'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import MentorAvatar from '@/components/dashboard/mentor-avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/lib'

interface Props {
    request: {
        id: string
        mentor_full_name: string
        mentor_photo_url?: string | null
        proposed_start: string | null
        note: string | null
        is_reschedule?: boolean
        original_scheduled_at?: string | null
    }
    timezone?: string | null
}

export function MentorSessionRequestCard({ request, timezone = null }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
    const [error, setError] = useState<string | null>(null)

    const formattedTime = request.proposed_start
        ? `${formatDateInTz(request.proposed_start, timezone)} at ${formatTimeInTz(request.proposed_start, timezone)}`
        : 'Time TBD'

    const originalTime = request.original_scheduled_at
        ? `${formatDateInTz(request.original_scheduled_at, timezone)} at ${formatTimeInTz(request.original_scheduled_at, timezone)}`
        : null

    const handleAccept = async () => {
        setLoading('accept')
        setError(null)
        try {
            await handleMentorshipRequest(request.id, 'accept')
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to accept request')
        } finally {
            setLoading(null)
        }
    }

    const handleDecline = async () => {
        setLoading('decline')
        setError(null)
        try {
            await handleMentorshipRequest(request.id, 'reject')
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to decline request')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="rounded-card bg-card p-5 shadow-border ring-1 ring-tint-amber-foreground/15 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3.5">
                    <MentorAvatar
                        name={request.mentor_full_name}
                        photoUrl={request.mentor_photo_url}
                        fallbackClassName="bg-tint-amber text-tint-amber-foreground"
                    />
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground text-pretty">
                            {request.is_reschedule
                                ? `${request.mentor_full_name} wants to reschedule`
                                : `${request.mentor_full_name} requested a session`}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground tabular-nums">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="size-4" />
                                {request.is_reschedule ? `New time: ${formattedTime}` : formattedTime}
                            </span>
                        </div>
                        {request.is_reschedule && originalTime && (
                            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                                Current session: {originalTime}
                            </p>
                        )}
                        {request.note && (
                            <p className="mt-2 rounded-control bg-muted px-3 py-2 text-sm text-foreground text-pretty">&ldquo;{request.note}&rdquo;</p>
                        )}
                        {error && (
                            <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDecline}
                        disabled={loading !== null}
                        className={buttonVariants({ variant: 'destructive-ghost' })}
                    >
                        <XCircle />
                        {loading === 'decline' ? 'Declining…' : 'Decline'}
                    </button>
                    <button
                        type="button"
                        onClick={handleAccept}
                        disabled={loading !== null}
                        className={cn(buttonVariants(), 'bg-success hover:bg-success/90')}
                    >
                        <CheckCircle2 weight="fill" />
                        {loading === 'accept' ? 'Accepting…' : 'Accept'}
                    </button>
                </div>
            </div>
        </div>
    )
}
