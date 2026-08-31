import { SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'

// Degree subjects (Law, Engineering, ...) matter most when scanning a mentor at a
// glance, so they lead; exam / A-Level / interview tags trail behind them.
const GROUP_PRIORITY = [
    'Cambridge Subjects',
    'Oxford Subjects',
    'Oxbridge Entrance Exams',
    'A-Level Subjects',
    'GCSE Subjects',
    'Oxbridge Interview',
    'Other'
]

const SUBJECT_RANK: Record<string, number> = {}
for (const group of Object.keys(SUBJECT_OPTIONS)) {
    const rank = GROUP_PRIORITY.indexOf(group)
    for (const subject of SUBJECT_OPTIONS[group]) {
        const next = rank === -1 ? GROUP_PRIORITY.length : rank
        // A subject listed in several groups keeps its highest-priority rank.
        if (!(subject in SUBJECT_RANK) || next < SUBJECT_RANK[subject]) {
            SUBJECT_RANK[subject] = next
        }
    }
}

// Unknown / free-text entries sort after everything we recognise.
const UNKNOWN_RANK = GROUP_PRIORITY.length + 1

export function subjectRank(subject: string): number {
    return SUBJECT_RANK[subject] ?? UNKNOWN_RANK
}

// Stable sort that pulls degree subjects to the front, otherwise keeps the
// mentor's own ordering.
export function sortBySubjectPriority(expertise: string[] | null | undefined): string[] {
    if (!expertise) return []
    return expertise
        .map((subject, index) => ({ subject, index }))
        .sort((a, b) => subjectRank(a.subject) - subjectRank(b.subject) || a.index - b.index)
        .map(item => item.subject)
}
