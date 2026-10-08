'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react/ssr'
import SessionRatingCard from '@/components/feedback/session-rating-card'

interface FeedbackContentProps {
    sessionId: string
    mentorName: string
    mentorPhotoUrl: string | null
    scheduledAt: string | null
}

/**
 * The page version of the rating form: the same shared card as the dashboard
 * popup, centered on its own.
 *
 * This page used to lead with a full "Experiencing an issue? Contact a success
 * manager" form in the left half, which buried the actual task and primed
 * students to think about problems before they had rated anything. Support is
 * now a link that opens the standard Help & Support panel (Claire's thread),
 * the same one every other dashboard route uses.
 */
export default function FeedbackContent({
    sessionId,
    mentorName,
    mentorPhotoUrl,
    scheduledAt,
}: FeedbackContentProps) {
    const router = useRouter()

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center py-10 px-4">
            <div className="w-full max-w-md">
                <Link
                    href="/dashboard/student/sessions"
                    className="mb-4 inline-flex items-center gap-1.5 rounded-full py-1 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to my sessions
                </Link>

                <div className="overflow-hidden rounded-sheet bg-card shadow-border">
                    <SessionRatingCard
                        sessionId={sessionId}
                        mentorName={mentorName}
                        mentorPhotoUrl={mentorPhotoUrl}
                        scheduledAt={scheduledAt}
                        // Straight back to the sessions list — the student has
                        // finished the task, so a success screen with another
                        // button to press is one click of dead weight.
                        onSubmitted={() => {
                            router.push('/dashboard/student/sessions')
                            router.refresh()
                        }}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('open-help-support'))}
                    className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                    Something go wrong? <span className="font-medium text-brand underline underline-offset-2">Contact support</span>
                </button>
            </div>
        </div>
    )
}
