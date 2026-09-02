'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import MentorSessionCheckinModal from '@/components/dashboard/mentor-session-checkin-modal'
import type { MentorSessionCheckin, NextSessionState } from '@/lib/mentor-session-checkin'

/**
 * Dev-only harness for the mentor post-session check-in.
 *
 * Renders the real modal in preview mode, so nothing is written to
 * `mentor_session_checkins` and each variant can be replayed. This exists
 * because the popup's three states depend on what a mentor's calendar happens
 * to hold, and manufacturing those states means writing rows into production.
 *
 * The nested "Request a session" modal is the live one — opening it is safe,
 * but sending from it really does send the student a request.
 */
const VARIANTS: { state: NextSessionState; title: string; body: string }[] = [
    {
        state: 'none',
        title: 'Nothing booked',
        body: 'The full popup: homework question, booking question, and the Request a session button. This is the only state that asks about booking.',
    },
    {
        state: 'scheduled',
        title: 'Next session already booked',
        body: 'A confirmed future session exists, so the booking question is skipped and the date is shown back instead.',
    },
    {
        state: 'requested',
        title: 'Time already proposed',
        body: 'A request is pending with the student. Also skipped — the mentor has already done their part.',
    },
]

/**
 * Built outside the component on purpose: the fixture dates are read off the
 * clock, and react-hooks/purity treats a clock read inside a component as
 * impure wherever it appears.
 */
function buildPreviewCheckin(state: NextSessionState): MentorSessionCheckin {
    const now = Date.now()
    return {
        sessionId: 'preview-session',
        studentId: 'preview-student',
        studentName: 'Alex Morgan',
        scheduledAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        nextSessionState: state,
        nextSessionAt:
            state === 'scheduled' ? new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString() : null,
    }
}

export default function MentorCheckinPreviewContent() {
    const [checkin, setCheckin] = useState<MentorSessionCheckin | null>(null)
    // Bumped on every launch so the modal remounts with fresh answers, rather
    // than staying closed after the first view.
    const [run, setRun] = useState(0)

    const launch = (state: NextSessionState) => {
        setCheckin(buildPreviewCheckin(state))
        setRun((n) => n + 1)
    }

    return (
        <div className="p-6 sm:p-10 max-w-3xl">
            <h1 className="text-2xl font-extrabold text-gray-900">Mentor check-in preview</h1>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Pick a state to see exactly what a mentor sees after a session. This page is
                development-only and records no check-in, so you can replay any of them as many
                times as you like. Note that the nested &ldquo;Request a session&rdquo; modal is the
                live one — sending from it really does send a request.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {VARIANTS.map((variant) => (
                    <button
                        key={variant.state}
                        type="button"
                        onClick={() => launch(variant.state)}
                        className="text-left p-5 rounded-2xl border border-gray-200 bg-white hover:border-accent hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                    {variant.state}
                                </p>
                                <p className="font-bold text-gray-900">{variant.title}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed">{variant.body}</p>
                    </button>
                ))}
            </div>

            {checkin && (
                <MentorSessionCheckinModal
                    key={`${checkin.nextSessionState}-${run}`}
                    checkin={checkin}
                    students={[{ id: 'preview-student', full_name: 'Alex Morgan' }]}
                    mentorTimezone={null}
                    preview
                />
            )}
        </div>
    )
}
