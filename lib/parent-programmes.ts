/**
 * The three Access Oxbridge programmes shown to parents on
 * /dashboard/parent/programmes. UI only for now: nothing here is charged or
 * saved, and the buttons open a "coming soon" note.
 *
 * DRAFT: names, prices, hours and features are placeholders for the boss to
 * replace. While PROGRAMMES_DRAFT is true the page says so.
 *
 * `{child}` and `{childs}` in any text are swapped for the child's first name
 * ("Amelia", "Amelia’s") or "your child" / "your child’s".
 */
export const PROGRAMMES_DRAFT = true

export type ProgrammeIcon = 'compass' | 'books' | 'graduation'

export interface Programme {
    id: string
    name: string
    tagline: string
    icon: ProgrammeIcon
    /** Monthly price in pounds; 0 is free. */
    monthly: number
    /** Monthly price when paid for the year up front, if offered. */
    yearly?: number
    /** Show "From" before the price. */
    from?: boolean
    recommended?: boolean
    cta: string
    /** Small line under the button. */
    note?: string
    /** Line above the feature list, e.g. "Everything in Discover, and:". */
    lead?: string
    features: string[]
}

export const PROGRAMMES: Programme[] = [
    {
        id: 'discover',
        name: 'Discover',
        tagline: 'See how the programme works',
        icon: 'compass',
        monthly: 0,
        cta: 'Included with your account',
        features: [
            'The Progress Tracker and parent portal',
            'Parent guides to the Oxbridge application',
            'Example session reports and recordings',
            'A success manager for your questions',
        ],
    },
    {
        id: 'prepare',
        name: 'Prepare',
        tagline: 'One-to-one mentoring for a strong application',
        icon: 'books',
        monthly: 249,
        yearly: 207,
        recommended: true,
        cta: 'Choose Prepare',
        note: 'No commitment · Cancel anytime',
        lead: 'Everything in Discover, and:',
        features: [
            'An Oxford or Cambridge mentor matched to {childs} subject',
            '4 one-to-one sessions a month',
            'Personal statement feedback, draft by draft',
            'A written report after every session',
            'Recordings of every session to watch back',
            '{Childs} guides, unlocked',
        ],
    },
    {
        id: 'excel',
        name: 'Excel',
        tagline: 'Full support, from first idea to offer',
        icon: 'graduation',
        monthly: 449,
        from: true,
        cta: 'Choose Excel',
        note: 'No commitment · Cancel anytime',
        lead: 'Everything in Prepare, plus:',
        features: [
            'Twice the sessions: 8 a month with {childs} mentor',
            'Admissions test preparation and timed practice',
            'Mock interviews in the Oxford and Cambridge style',
            'A super-curricular reading plan',
            'A monthly progress call with your success manager',
            'Priority mentor matching',
        ],
    },
]

/** Percentage saved by paying yearly, rounded to a whole number. */
export function yearlySaving(p: Programme): number | null {
    if (!p.yearly || !p.monthly) return null
    return Math.round((1 - p.yearly / p.monthly) * 100)
}
