/** Approved membership copy. Checkout stays off until billing is configured. */
export interface Programme {
    id: string
    name: string
    tagline: string
    monthly: number
    annual?: number
    recommended?: boolean
    lead: string
    features: string[]
    footnote?: string
}

export const PROGRAMMES: Programme[] = [
    {
        id: 'lite',
        name: 'Oxbridge Lite',
        tagline:
            'For families who want an Oxford or Cambridge expert in their child’s corner, alongside school.',
        monthly: 247,
        lead: 'Includes',
        features: [
            '1 private mentor, matched to your child',
            '2 one-to-one sessions a month',
            'A personal plan every month',
            'Sessions recorded and transcribed',
            'A report after every session',
            'Work set between sessions',
            'Parent progress tracker',
            '24/7 messaging with your mentor and the academic team',
            'The Access Oxbridge Private Library',
        ],
    },
    {
        id: 'excel',
        name: 'Oxbridge Excel',
        tagline:
            'For families who want the complete programme, with a dedicated team around their child.',
        monthly: 397,
        annual: 3970,
        recommended: true,
        lead: 'Everything in Lite, plus',
        features: [
            '2 private mentors',
            '4 one-to-one sessions a month',
            'A dedicated success manager',
            'Fortnightly Parent Briefing and parent dashboard',
            'Termly Readiness Review',
            'Recorded mock interview each term, with feedback',
            'Academic Portfolio and milestone certificates',
            'GCSE and A-level subject-choice guidance',
            'Study skills sessions',
            'Monthly Oxbridge webinar, with replays',
            'Competition and project support',
            'The Parent Handbook',
            'Priority place for the Year 12 Programme',
        ],
    },
    {
        id: 'concierge',
        name: 'Oxbridge Concierge',
        tagline:
            'For families who want every door opened, with senior guidance at every step.',
        monthly: 1250,
        lead: 'Everything in Excel, plus',
        features: [
            'Any mentor, across every subject',
            '8 one-to-one sessions a month',
            'Your head consultant, on 24/7 messaging',
            'Quarterly family review meetings',
            'Public speaking with experienced speakers',
            'Work experience support and guidance',
            'Exclusive resources beyond the Private Library',
            'Priority scheduling',
            'Specialist mentors recruited on request*',
        ],
        footnote: '*Subject to availability and our terms.',
    },
]
