import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/utils/supabase/types'
import type { StudentMilestone } from '@/components/dashboard/milestone-modal'
import { milestoneCutoff, highestMilestoneAtOrBelow } from '@/config/milestones.config'

/**
 * The session-count milestone this student should be congratulated for right
 * now, or null.
 *
 * Three things have to be true, in this order:
 *
 *   1. Their completed-session count is at or past a milestone.
 *   2. The session that crossed it happened on or after MILESTONE_CUTOFF.
 *      This is what stops students who were already past 10 or 20 sessions
 *      when the feature shipped from being congratulated for old work, and it
 *      is why no backfill rows exist in `student_session_milestones`.
 *   3. They have not already been shown it.
 *
 * Called from the dashboard layout, so it runs on every dashboard page load for
 * a student. Two small queries, both indexed, and neither writes anything.
 */
export async function selectStudentMilestone(
    /** The layout's RLS-respecting server client. Reads only. */
    supabase: SupabaseClient<Database>,
    studentId: string
): Promise<StudentMilestone | null> {
    // Ascending, so the Nth row is the session that crossed the Nth milestone.
    const { data: completed } = await supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: true })

    const sessions = completed || []
    const milestone = highestMilestoneAtOrBelow(sessions.length)
    if (!milestone) return null

    // A completed session with no scheduled_at cannot be placed relative to the
    // cutoff, so it is treated as history and never triggers a celebration.
    // Compared as Dates, not strings: Postgres returns timestamptz with a
    // "+00:00" offset while the cutoff is written with a "Z", and those two
    // spellings of the same instant do not compare correctly as text.
    const crossedAt = sessions[milestone - 1]?.scheduled_at
    if (!crossedAt || new Date(crossedAt) < new Date(milestoneCutoff())) return null

    const { data: alreadyShown } = await supabase
        .from('student_session_milestones')
        .select('milestone')
        .eq('student_id', studentId)
        .eq('milestone', milestone)
        .maybeSingle()

    if (alreadyShown) return null

    return { milestone, sessionsCompleted: sessions.length }
}
