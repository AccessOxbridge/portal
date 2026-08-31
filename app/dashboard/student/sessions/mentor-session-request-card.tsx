'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { handleMentorshipRequest } from '@/lib/actions/mentorship-requests'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import MentorAvatar from '@/components/dashboard/mentor-avatar'

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
        <div className="p-6 bg-white rounded-2xl border border-amber-200 shadow-lg shadow-amber-100/50 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                    <MentorAvatar
                        name={request.mentor_full_name}
                        photoUrl={request.mentor_photo_url}
                        fallbackClassName="bg-amber-100 text-amber-600"
                    />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {request.is_reschedule
                                ? `${request.mentor_full_name} wants to reschedule`
                                : `${request.mentor_full_name} requested a session`}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {request.is_reschedule ? `New time: ${formattedTime}` : formattedTime}
                            </span>
                        </div>
                        {request.is_reschedule && originalTime && (
                            <p className="mt-1 text-xs text-gray-400">
                                Current session: {originalTime}
                            </p>
                        )}
                        {request.note && (
                            <p className="mt-2 text-sm text-gray-600 italic">&ldquo;{request.note}&rdquo;</p>
                        )}
                        {error && (
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDecline}
                        disabled={loading !== null}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                        <XCircle className="w-4 h-4" />
                        {loading === 'decline' ? 'Declining…' : 'Decline'}
                    </button>
                    <button
                        type="button"
                        onClick={handleAccept}
                        disabled={loading !== null}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {loading === 'accept' ? 'Accepting…' : 'Accept'}
                    </button>
                </div>
            </div>
        </div>
    )
}
