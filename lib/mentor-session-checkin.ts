import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/utils/supabase/types'
import { mentorCheckinWindowStart } from '@/config/mentor-checkin.config'

/**
 * What the mentor's calendar already says about the next session with this
 * student, so the popup can avoid asking a question the system can answer:
 *
 *   'scheduled' — a confirmed future session exists. We show it and skip the
 *                 booking question entirely.
 *   'requested' — the mentor has already proposed a time and is waiting on the
 *                 student. Also skipped: they have done their part.
 *   'none'      — nothing on the books. This is the only case we ask about.
 */
export type NextSessionState = 'none' | 'scheduled' | 'requested'

/**
 * The one recently-completed session this mentor is being asked to check in
 * about. Selected server-side in the dashboard layout so the popup can appear
 * on any mentor dashboard page, not just the ones that happen to load sessions.
 */
export interface MentorSessionCheckin {
    sessionId: string
    studentId: string
    studentName: string
    scheduledAt: string | null
    nextSessionState: NextSessionState
    /** ISO time of the confirmed next session, when `nextSessionState` is 'scheduled'. */
    nextSessionAt: string | null
}

/**
 * The post-session check-in this mentor owes, or null.
 *
 * Newest first: the freshest session is the one they can actually remember, and
 * we ask about at most one at a time. A mentor with several unchecked sessions
 * gets the most recent; the rest are simply never volunteered, exactly as the
 * student rating popup behaves.
 *
 * `mentorCheckinWindowStart()` is the later of "7 days ago" and the go-live
 * cutoff, which is what stops the pre-existing backlog of completed sessions
 * ambushing anyone on their next login.
 *
 * Called from the dashboard layout, so it runs on every mentor dashboard page
 * load. Three small indexed reads, and none of them writes anything.
 */
export async function selectMentorSessionCheckin(
    /** The layout's RLS-respecting server client. Reads only. */
    supabase: SupabaseClient<Database>,
    mentorId: string
): Promise<MentorSessionCheckin | null> {
    const nowIso = new Date().toISOString()

    const { data: recentSessions } = await supabase
        .from('sessions')
        .select('id, scheduled_at, student_id, student:profiles!sessions_student_id_fkey (full_name)')
        .eq('mentor_id', mentorId)
        .eq('status', 'completed')
        .gte('scheduled_at', mentorCheckinWindowStart())
        .lte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: false })
        .limit(10)

    const candidates = recentSessions || []
    if (candidates.length === 0) return null

    // Anything already answered or dismissed is out. One lookup rather than a
    // join: the candidate set is capped at 10.
    const { data: handled } = await supabase
        .from('mentor_session_checkins')
        .select('session_id')
        .in('session_id', candidates.map((s) => s.id))

    const handledIds = new Set((handled || []).map((h) => h.session_id))
    const next = candidates.find((s) => !handledIds.has(s.id))
    if (!next || !next.student_id) return null

    const studentId = next.student_id

    // Is there already a confirmed session ahead with this student? If so the
    // booking question is pointless, so we answer it for them and show the date.
    const { data: upcoming } = await supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('mentor_id', mentorId)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .gt('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    let nextSessionState: NextSessionState = 'none'
    let nextSessionAt: string | null = null

    if (upcoming?.scheduled_at) {
        nextSessionState = 'scheduled'
        nextSessionAt = upcoming.scheduled_at
    } else {
        // Nothing confirmed — but a time the mentor already proposed and is
        // waiting on still counts as done. Either direction of pending request
        // means a booking conversation is live, so we do not nag.
        const { count } = await supabase
            .from('mentorship_requests')
            .select('id', { count: 'exact', head: true })
            .eq('mentor_id', mentorId)
            .eq('student_id', studentId)
            .eq('status', 'pending')

        if ((count ?? 0) > 0) nextSessionState = 'requested'
    }

    return {
        sessionId: next.id,
        studentId,
        studentName: (next as { student?: { full_name?: string | null } }).student?.full_name || 'your student',
        scheduledAt: next.scheduled_at,
        nextSessionState,
        nextSessionAt,
    }
}
