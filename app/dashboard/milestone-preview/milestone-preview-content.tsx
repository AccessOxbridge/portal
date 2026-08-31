'use client'

import { useState } from 'react'
import { Trophy } from 'lucide-react'
import MilestoneModal from '@/components/dashboard/milestone-modal'
import { MILESTONES, MILESTONE_COPY, type Milestone } from '@/config/milestones.config'

/**
 * Dev-only harness for the milestone celebration.
 *
 * Renders the real MilestoneModal with the real confetti, in preview mode so
 * nothing is written to `student_session_milestones`. This exists because the
 * only other way to see the popup is to genuinely be a student who has just
 * completed their 5th session, and manufacturing that means writing rows into
 * production.
 */
export default function MilestonePreviewContent() {
    const [selected, setSelected] = useState<Milestone | null>(null)
    // Bumped on every launch so the modal remounts and replays its confetti,
    // rather than staying closed after the first view.
    const [run, setRun] = useState(0)

    const launch = (milestone: Milestone) => {
        setSelected(milestone)
        setRun((n) => n + 1)
    }

    return (
        <div className="p-6 sm:p-10 max-w-3xl">
            <h1 className="text-2xl font-extrabold text-gray-900">Milestone preview</h1>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Pick a milestone to see exactly what a student sees. This page is
                development-only and records nothing, so you can replay any of
                them as many times as you like.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {MILESTONES.map((milestone) => {
                    const copy = MILESTONE_COPY[milestone]
                    return (
                        <button
                            key={milestone}
                            type="button"
                            onClick={() => launch(milestone)}
                            className="text-left p-5 rounded-2xl border border-gray-200 bg-white hover:border-accent hover:shadow-md transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rich-beige-accent flex items-center justify-center shrink-0">
                                    <Trophy className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                        {copy.badge}
                                    </p>
                                    <p className="font-bold text-gray-900">{copy.title}</p>
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-gray-500 leading-relaxed">{copy.body}</p>
                        </button>
                    )
                })}
            </div>

            {selected && (
                <MilestoneModal
                    key={`${selected}-${run}`}
                    milestone={{ milestone: selected, sessionsCompleted: selected }}
                    ready
                    preview
                />
            )}
        </div>
    )
}
