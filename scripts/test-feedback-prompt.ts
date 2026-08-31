/**
 * Standalone checks for the post-session feedback prompt selection logic.
 * No test framework in this repo, so this is a plain script (see MANUAL.md /
 * other scripts/ integration checks for the convention).
 *
 *   bun run scripts/test-feedback-prompt.ts
 *
 * Read-only: touches no database. It exercises the two pure pieces that decide
 * whether a student gets asked to rate a session — the prompt window, and the
 * "pick one unrated, undismissed session, newest first" filter that
 * app/dashboard/layout.tsx applies to the rows it fetches.
 */

import {
    FEEDBACK_PROMPT_CUTOFF,
    FEEDBACK_PROMPT_WINDOW_DAYS,
    feedbackPromptWindowStart,
} from '../config/feedback.config'

let passed = 0
let failed = 0

function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected)
    if (ok) {
        passed++
        console.log(`  ✓ ${name}`)
    } else {
        failed++
        console.log(`  ✗ ${name}`)
        console.log(`      expected: ${JSON.stringify(expected)}`)
        console.log(`      actual:   ${JSON.stringify(actual)}`)
    }
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Mirrors the selection in app/dashboard/layout.tsx: of the sessions inside the
 * window, take the newest that has neither been rated nor dismissed.
 */
interface Candidate {
    id: string
    scheduled_at: string
}
function pickSession(
    sessions: Candidate[],
    ratedIds: string[],
    dismissedIds: string[],
    now: Date
): string | null {
    const windowStart = new Date(feedbackPromptWindowStart(now)).getTime()
    const handled = new Set([...ratedIds, ...dismissedIds])
    const next = sessions
        .filter((s) => {
            const t = new Date(s.scheduled_at).getTime()
            return t >= windowStart && t <= now.getTime()
        })
        .sort(
            (a, b) =>
                new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
        )
        .find((s) => !handled.has(s.id))
    return next ? next.id : null
}

console.log('\nfeedbackPromptWindowStart')
{
    // Well after go-live, the 7-day window is what binds.
    const now = new Date('2026-10-01T12:00:00.000Z')
    check(
        'uses now - 7 days once that is later than the cutoff',
        feedbackPromptWindowStart(now),
        new Date(now.getTime() - FEEDBACK_PROMPT_WINDOW_DAYS * DAY).toISOString()
    )

    // Just after go-live, the cutoff is later than now-7d and must win —
    // this is what stops the pre-existing backlog being prompted.
    const justAfterLaunch = new Date('2026-09-02T12:00:00.000Z')
    check(
        'clamps to the go-live cutoff in the first week',
        feedbackPromptWindowStart(justAfterLaunch),
        new Date(FEEDBACK_PROMPT_CUTOFF).toISOString()
    )
    check(
        'never returns a start earlier than the cutoff',
        new Date(feedbackPromptWindowStart(justAfterLaunch)).getTime() >=
            new Date(FEEDBACK_PROMPT_CUTOFF).getTime(),
        true
    )
}

console.log('\npickSession')
{
    const now = new Date('2026-10-01T12:00:00.000Z')
    const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString()

    check(
        'picks the newest session in the window',
        pickSession(
            [
                { id: 'old', scheduled_at: iso(5) },
                { id: 'newest', scheduled_at: iso(1) },
                { id: 'mid', scheduled_at: iso(3) },
            ],
            [],
            [],
            now
        ),
        'newest'
    )

    check(
        'skips a session already rated',
        pickSession(
            [
                { id: 'newest', scheduled_at: iso(1) },
                { id: 'next', scheduled_at: iso(2) },
            ],
            ['newest'],
            [],
            now
        ),
        'next'
    )

    check(
        'skips a session the student dismissed',
        pickSession(
            [
                { id: 'newest', scheduled_at: iso(1) },
                { id: 'next', scheduled_at: iso(2) },
            ],
            [],
            ['newest'],
            now
        ),
        'next'
    )

    check(
        'returns null when everything in the window is handled',
        pickSession(
            [
                { id: 'a', scheduled_at: iso(1) },
                { id: 'b', scheduled_at: iso(2) },
            ],
            ['a'],
            ['b'],
            now
        ),
        null
    )

    check(
        'ignores sessions older than the 7-day window',
        pickSession([{ id: 'stale', scheduled_at: iso(9) }], [], [], now),
        null
    )

    check(
        'ignores sessions scheduled in the future',
        pickSession([{ id: 'future', scheduled_at: iso(-2) }], [], [], now),
        null
    )

    // The regression that motivated the cutoff: a student with a long tail of
    // unrated pre-launch sessions must be asked about none of them.
    const justAfterLaunch = new Date('2026-09-02T12:00:00.000Z')
    const backlog = Array.from({ length: 22 }, (_, i) => ({
        id: `legacy-${i}`,
        scheduled_at: new Date('2026-07-20T08:00:00.000Z').toISOString(),
    }))
    check(
        'never prompts a 22-session pre-cutoff backlog',
        pickSession(backlog, [], [], justAfterLaunch),
        null
    )
    check(
        'but does prompt a post-cutoff session for that same student',
        pickSession(
            [...backlog, { id: 'fresh', scheduled_at: '2026-09-01T15:00:00.000Z' }],
            [],
            [],
            justAfterLaunch
        ),
        'fresh'
    )
}

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
