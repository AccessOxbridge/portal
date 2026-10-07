import {
    describeTarget,
    evaluateMentorRatings,
    evaluatePace,
    isPlanType,
    PACE_STATUS_ORDER,
    type MentorRatingResult,
    type PaceResult,
    type SessionTarget,
} from '@/lib/session-frequency'
import type { createAdminClient } from '@/utils/supabase/admin'

type Db = ReturnType<typeof createAdminClient>

export interface StudentPaceRow {
    studentId: string
    name: string
    email: string | null
    mentorNames: string[]
    target: (SessionTarget & { note: string | null }) | null
    targetLabel: string | null
    pace: PaceResult
    lastCompletedAt: string | null
    nextBookedAt: string | null
    /** Past sessions still 'active': no-shows or a missed Zoom "ended" webhook. */
    unconfirmed: number
    completedAllTime: number
    /** Default start date when setting a target: first completed session, else null. */
    firstCompletedDate: string | null
}

export interface MentorRatingRow {
    mentorId: string
    name: string
    rating: Omit<MentorRatingResult, 'lastRatedAt'> & { lastRatedAt: string | null }
    currentStudents: number
    completedSessions: number
}

interface SessionLite {
    student_id: string
    mentor_id: string
    status: string
    scheduled_at: string | null
}

const PAGE = 1000

/** PostgREST caps a response at max-rows (1000), so page explicitly. */
async function fetchAllSessions(db: Db): Promise<SessionLite[]> {
    const rows: SessionLite[] = []
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await db
            .from('sessions')
            .select('student_id, mentor_id, status, scheduled_at')
            .neq('status', 'cancelled')
            .order('id')
            .range(from, from + PAGE - 1)
        if (error) throw new Error(`sessions read failed: ${error.message}`)
        rows.push(...(data || []))
        if (!data || data.length < PAGE) break
    }
    return rows
}

function toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10)
}

/**
 * Everything the Performance page shows. Reads only: sessions, targets,
 * assignments, profiles, mentors and student feedback. Nothing here writes.
 */
export async function loadPerformanceData(db: Db, now: Date = new Date()) {
    const [
        sessions,
        { data: students },
        { data: targets },
        { data: assignments },
        { data: mentors },
        { data: feedbacks },
    ] = await Promise.all([
        fetchAllSessions(db),
        db.from('profiles').select('id, full_name, email').eq('role', 'student'),
        db.from('student_session_targets').select('student_id, plan_type, sessions, weeks, start_date, note'),
        db.from('student_mentor_assignments').select('student_id, mentor_id').eq('is_current', true),
        db.from('mentors').select('id, status'),
        db
            .from('form_responses')
            .select('session_id, rating, responses, created_at')
            .eq('form_type', 'student_feedback'),
    ])

    // Names for every mentor we might mention.
    const mentorIds = new Set<string>([
        ...(mentors || []).map((m) => m.id),
        ...(assignments || []).map((a) => a.mentor_id),
        ...sessions.map((s) => s.mentor_id),
    ])
    const nameById = new Map<string, string>()
    const mentorIdList = [...mentorIds]
    for (let i = 0; i < mentorIdList.length; i += 200) {
        const { data } = await db
            .from('profiles')
            .select('id, full_name')
            .in('id', mentorIdList.slice(i, i + 200))
        ;(data || []).forEach((p) => nameById.set(p.id, p.full_name || 'Unnamed mentor'))
    }

    // ---- Students ------------------------------------------------------
    const targetByStudent = new Map((targets || []).map((t) => [t.student_id, t]))
    const mentorsByStudent = new Map<string, Set<string>>()
    ;(assignments || []).forEach((a) => {
        const set = mentorsByStudent.get(a.student_id) || new Set<string>()
        set.add(a.mentor_id)
        mentorsByStudent.set(a.student_id, set)
    })

    const sessionsByStudent = new Map<string, SessionLite[]>()
    sessions.forEach((s) => {
        const list = sessionsByStudent.get(s.student_id) || []
        list.push(s)
        sessionsByStudent.set(s.student_id, list)
    })

    const studentRows: StudentPaceRow[] = (students || []).map((student) => {
        const own = sessionsByStudent.get(student.id) || []
        const completed = own
            .filter((s) => s.status === 'completed' && s.scheduled_at)
            .map((s) => ({ at: new Date(s.scheduled_at as string), mentorId: s.mentor_id }))
            .sort((a, b) => a.at.getTime() - b.at.getTime())
        const active = own.filter((s) => s.status === 'active' && s.scheduled_at)
        const upcoming = active
            .map((s) => new Date(s.scheduled_at as string))
            .filter((d) => d >= now)
            .sort((a, b) => a.getTime() - b.getTime())
        const unconfirmed = active.filter((s) => new Date(s.scheduled_at as string) < now).length

        // Prefer the current assignment; fall back to whoever ran their latest session.
        let mentorIdsForStudent = [...(mentorsByStudent.get(student.id) || [])]
        if (mentorIdsForStudent.length === 0 && completed.length > 0) {
            mentorIdsForStudent = [completed[completed.length - 1].mentorId]
        }

        const raw = targetByStudent.get(student.id)
        const target =
            raw && isPlanType(raw.plan_type)
                ? {
                      planType: raw.plan_type,
                      sessions: raw.sessions,
                      weeks: Number(raw.weeks),
                      startDate: raw.start_date,
                      note: raw.note,
                  }
                : null

        const completedDates = completed.map((c) => c.at)
        return {
            studentId: student.id,
            name: student.full_name || student.email || 'Unnamed student',
            email: student.email,
            mentorNames: mentorIdsForStudent.map((id) => nameById.get(id) || 'Unknown mentor'),
            target,
            targetLabel: target ? describeTarget(target) : null,
            pace: evaluatePace(target, completedDates, now),
            lastCompletedAt: completed.length > 0 ? completed[completed.length - 1].at.toISOString() : null,
            nextBookedAt: upcoming.length > 0 ? upcoming[0].toISOString() : null,
            unconfirmed,
            completedAllTime: completed.length,
            firstCompletedDate: completed.length > 0 ? toIsoDate(completed[0].at) : null,
        }
    })

    studentRows.sort(
        (a, b) =>
            PACE_STATUS_ORDER[a.pace.status] - PACE_STATUS_ORDER[b.pace.status] ||
            b.pace.shortBy - a.pace.shortBy ||
            (b.pace.daysSinceLast ?? -1) - (a.pace.daysSinceLast ?? -1) ||
            a.name.localeCompare(b.name)
    )

    // ---- Mentors -------------------------------------------------------
    // Per-session ratings only, attributed to the session's mentor. Same
    // rating read as the Feedback page: the `rating` column, falling back to
    // the JSON for rows written before that column was populated.
    const feedbackSessionIds = [...new Set((feedbacks || []).map((f) => f.session_id))]
    const mentorBySession = new Map<string, string>()
    for (let i = 0; i < feedbackSessionIds.length; i += 200) {
        const { data } = await db
            .from('sessions')
            .select('id, mentor_id')
            .in('id', feedbackSessionIds.slice(i, i + 200))
        ;(data || []).forEach((s) => mentorBySession.set(s.id, s.mentor_id))
    }

    const ratingsByMentor = new Map<string, { rating: number; submittedAt: Date }[]>()
    ;(feedbacks || []).forEach((f) => {
        const mentorId = mentorBySession.get(f.session_id)
        const responses = (f.responses || {}) as Record<string, unknown>
        const rating = f.rating ?? Number(responses.mentor_rating)
        if (!mentorId || !rating || !f.created_at) return
        const list = ratingsByMentor.get(mentorId) || []
        list.push({ rating, submittedAt: new Date(f.created_at) })
        ratingsByMentor.set(mentorId, list)
    })

    const currentStudentsByMentor = new Map<string, number>()
    ;(assignments || []).forEach((a) =>
        currentStudentsByMentor.set(a.mentor_id, (currentStudentsByMentor.get(a.mentor_id) || 0) + 1)
    )
    const completedByMentor = new Map<string, number>()
    sessions
        .filter((s) => s.status === 'completed')
        .forEach((s) => completedByMentor.set(s.mentor_id, (completedByMentor.get(s.mentor_id) || 0) + 1))

    // Anyone who has been rated, has a student, or has taught.
    const relevantMentors = new Set<string>([
        ...ratingsByMentor.keys(),
        ...currentStudentsByMentor.keys(),
        ...completedByMentor.keys(),
    ])

    const mentorRows: MentorRatingRow[] = [...relevantMentors].map((mentorId) => {
        const result = evaluateMentorRatings(ratingsByMentor.get(mentorId) || [], now)
        return {
            mentorId,
            name: nameById.get(mentorId) || 'Unknown mentor',
            rating: { ...result, lastRatedAt: result.lastRatedAt ? result.lastRatedAt.toISOString() : null },
            currentStudents: currentStudentsByMentor.get(mentorId) || 0,
            completedSessions: completedByMentor.get(mentorId) || 0,
        }
    })

    mentorRows.sort((a, b) => {
        if (a.rating.flagged !== b.rating.flagged) return a.rating.flagged ? -1 : 1
        if ((a.rating.average === null) !== (b.rating.average === null)) return a.rating.average === null ? 1 : -1
        return (a.rating.average ?? 0) - (b.rating.average ?? 0) || a.name.localeCompare(b.name)
    })

    return { studentRows, mentorRows }
}
