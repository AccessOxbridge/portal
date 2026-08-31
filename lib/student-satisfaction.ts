import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/utils/supabase/types'
import { dueSurveyTier } from '@/config/satisfaction.config'

/**
 * The satisfaction check-in a student currently owes, if any.
 *
 * Chosen server-side in the dashboard layout so the banner appears on every
 * dashboard page rather than only the ones that happen to count sessions.
 */
export interface DueSatisfactionSurvey {
    /** The 4-session tier being answered for. Written to the row's primary key. */
    tier: number
    /** True completed-session count right now, stored alongside for context. */
    sessionsCompleted: number
}

/**
 * The satisfaction survey this student is due, or null.
 *
 * Two things have to be true:
 *
 *   1. Their completed-session count is at or past a multiple of 4.
 *   2. They have not already answered for that tier.
 *
 * Note there is no go-live cutoff here, unlike `selectStudentMilestone`. That
 * is deliberate — see the comment in satisfaction.config.ts.
 *
 * Called from the dashboard layout, so it runs on every dashboard page load
 * for a student. Two small indexed queries, and neither writes anything.
 */
export async function selectDueSatisfactionSurvey(
    /** The layout's RLS-respecting server client. Reads only. */
    supabase: SupabaseClient<Database>,
    studentId: string
): Promise<DueSatisfactionSurvey | null> {
    const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'completed')

    const sessionsCompleted = count ?? 0
    const tier = dueSurveyTier(sessionsCompleted)
    if (!tier) return null

    const { data: alreadyAnswered } = await supabase
        .from('student_satisfaction_surveys')
        .select('session_count')
        .eq('student_id', studentId)
        .eq('session_count', tier)
        .maybeSingle()

    if (alreadyAnswered) return null

    return { tier, sessionsCompleted }
}
