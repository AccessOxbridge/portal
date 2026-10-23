'use client'

import { useState } from 'react'
import { segmentClass, segmentTrack } from '@/components/ui/segmented'
import { ParentHome } from '@/components/parent/parent-home'
import type { ParentHomeData, ParentReport } from '@/lib/parent-dashboard'

/*
 * Mockup of the parent home with sample data, rendered by the same
 * component as the real page (/dashboard/parent), so the two never drift.
 * The switch shows each widget's empty state.
 */

const WEEKS = ['13 Aug', '20 Aug', '27 Aug', '3 Sep', '10 Sep', '17 Sep', '24 Sep', '1 Oct', '8 Oct', '15 Oct', '22 Oct']
const PER_WEEK = [0, 1, 2, 2, 1, 2, 2, 0, 2, 2, 2]

const REPORTS: ParentReport[] = [
    {
        id: 'r1',
        dateLabel: 'Monday 20 October',
        mentorName: 'Oliver Bennett',
        summary:
            'Amelia worked through a past HAT source passage on the Peasants’ Revolt. The reading was careful and the author’s bias came out quickly; the next step is turning those observations into a tighter written argument under time pressure.',
        keyPoints: ['Identified the source’s perspective within the first read', 'Comparisons between sources are improving', 'Timing: finished the extract in 52 of 60 minutes'],
        nextSteps: ['Complete one timed HAT extract before Thursday', 'Read chapter 3 of the reading list on medieval England'],
        fullReport: null,
    },
    {
        id: 'r2',
        dateLabel: 'Tuesday 14 October',
        mentorName: 'Oliver Bennett',
        summary: null,
        keyPoints: [],
        nextSteps: [],
        fullReport:
            '## Personal statement review\n\nThe opening now leads with Amelia’s own reading rather than a quotation, which makes it far more personal. The middle section still lists activities without reflection.\n\n## Next steps\n\n- Rewrite paragraph three to reflect on the museum placement',
    },
]

type Scenario = 'live' | 'starting' | 'unlinked'

function sample(scenario: Scenario, nameGiven: boolean): ParentHomeData {
    const live = scenario === 'live'
    const linked = scenario !== 'unlinked'
    let total = 0
    const points = WEEKS.map((label, i) => ({ label, completed: (total += PER_WEEK[i]), plan: i * 2 }))
    return {
        parentFirstName: 'Sarah',
        childFirstName: linked || nameGiven ? 'Amelia' : null,
        linked,
        greeting: 'Good afternoon',
        checklist: { activated: linked, profile: linked, matched: linked, booked: live },
        next: live
            ? { dateLabel: 'Thursday 23 October', timeLabel: '16:00', when: 'Tomorrow', topic: 'Timed HAT source extract', mentorName: 'Oliver Bennett', mentorPhotoUrl: null }
            : null,
        progress: live ? { points, total, planLabel: '2 sessions per week' } : null,
        attended: live ? { total, recent: 6, upcoming: 2 } : { total: 0, recent: 0, upcoming: 0 },
        reports: live ? REPORTS : [],
        reportsTotal: live ? 9 : 0,
        mentor: linked
            ? {
                  name: 'Oliver Bennett',
                  photoUrl: null,
                  college: 'Balliol College, Oxford',
                  subject: 'History',
                  bio: 'Final-year historian who has helped students through the HAT and interview preparation for three admissions rounds.',
              }
            : null,
        goal: linked ? { university: 'Cambridge', course: 'History', entryYear: 2027 } : null,
        milestones: { thresholds: [1, 5, 10, 20, 50, 100], completed: live ? total : 0 },
        hoursLeft: live ? 4 : linked ? 20 : null,
    }
}

export default function ParentPreview() {
    const [scenario, setScenario] = useState<Scenario>('live')
    const [nameGiven, setNameGiven] = useState(true)
    const states: { value: Scenario; label: string }[] = [
        { value: 'live', label: 'Live' },
        { value: 'starting', label: 'Just started' },
        { value: 'unlinked', label: 'Not linked yet' },
    ]

    return (
        <>
            <div className="mx-auto mb-8 max-w-3xl rounded-card border border-dashed border-border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Mockup only: preview a state</p>
                <div className="flex flex-wrap items-center gap-2">
                    <div className={segmentTrack} role="group" aria-label="Account state">
                        {states.map((s) => (
                            <button key={s.value} type="button" aria-pressed={scenario === s.value} className={segmentClass(scenario === s.value)} onClick={() => setScenario(s.value)}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    {scenario === 'unlinked' && (
                        <div className={segmentTrack} role="group" aria-label="Child's name">
                            <button type="button" aria-pressed={nameGiven} className={segmentClass(nameGiven)} onClick={() => setNameGiven(true)}>
                                Name given
                            </button>
                            <button type="button" aria-pressed={!nameGiven} className={segmentClass(!nameGiven)} onClick={() => setNameGiven(false)}>
                                No name
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Keyed so each switch replays the page load, as if opened in that state. */}
            <ParentHome key={`${scenario}-${nameGiven}`} data={sample(scenario, nameGiven)} onRequestHours={async () => true} />
        </>
    )
}
