import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MentorStudentsContent, { type StudentMetric } from './mentor-students-content'

export default async function MentorStudentsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    const { data: mentorRow } = await supabase
        .from('mentors')
        .select('timezone')
        .eq('id', user.id)
        .maybeSingle()
    const timezone = (mentorRow as { timezone?: string | null } | null)?.timezone ?? null

    // Current student assignments for this mentor
    const { data: assignments } = await supabase
        .from('student_mentor_assignments')
        .select(`
            student_id,
            created_at,
            student:profiles!student_mentor_assignments_student_id_fkey (
                full_name,
                email
            )
        `)
        .eq('mentor_id', user.id)
        .eq('is_current', true)
        .order('created_at', { ascending: false })

    const studentIds = Array.from(new Set((assignments || []).map((a) => a.student_id)))

    // All sessions this mentor has with these students
    const { data: sessions } = studentIds.length > 0
        ? await supabase
            .from('sessions')
            .select('id, student_id, status, scheduled_at')
            .eq('mentor_id', user.id)
            .in('student_id', studentIds)
        : { data: [] as any[] }

    const sessionRows = (sessions || []) as Array<{
        id: string
        student_id: string
        status: string
        scheduled_at: string | null
    }>

    // Which of those sessions have a mentor report
    const allSessionIds = sessionRows.map((s) => s.id)
    const { data: reports } = allSessionIds.length > 0
        ? await supabase
            .from('form_responses')
            .select('session_id')
            .eq('form_type', 'mentor_report')
            .in('session_id', allSessionIds)
        : { data: [] as any[] }
    const reportedSessionIds = new Set((reports || []).map((r) => r.session_id))

    // Student academic profiles (target uni/course, completeness)
    const { data: studentProfiles } = studentIds.length > 0
        ? await supabase
            .from('student_profiles')
            .select('id, target_university, target_course, is_complete')
            .in('id', studentIds)
        : { data: [] as any[] }
    const profileById = new Map(
        (studentProfiles || []).map((p: any) => [p.id, p])
    )

    const now = new Date().getTime()

    const students: StudentMetric[] = (assignments || []).map((a: any) => {
        const sid = a.student_id
        const theirSessions = sessionRows.filter((s) => s.student_id === sid)

        const completed = theirSessions.filter((s) => s.status === 'completed')
        const upcoming = theirSessions.filter(
            (s) =>
                s.status === 'active' &&
                s.scheduled_at != null &&
                new Date(s.scheduled_at).getTime() >= now
        )

        // Next upcoming session date
        const nextSession = upcoming
            .slice()
            .sort(
                (x, y) =>
                    new Date(x.scheduled_at as string).getTime() -
                    new Date(y.scheduled_at as string).getTime()
            )[0]

        // Last completed session date
        const lastCompleted = completed
            .filter((s) => s.scheduled_at != null)
            .slice()
            .sort(
                (x, y) =>
                    new Date(y.scheduled_at as string).getTime() -
                    new Date(x.scheduled_at as string).getTime()
            )[0]

        // Pending reports = completed sessions without a mentor report
        const pendingReports = completed.filter((s) => !reportedSessionIds.has(s.id)).length

        const sp = profileById.get(sid)

        return {
            id: sid,
            full_name: a.student?.full_name || 'Student',
            email: a.student?.email || null,
            assigned_at: a.created_at,
            total_sessions: theirSessions.length,
            sessions_completed: completed.length,
            upcoming_sessions: upcoming.length,
            next_session_at: nextSession?.scheduled_at ?? null,
            last_session_at: lastCompleted?.scheduled_at ?? null,
            pending_reports: pendingReports,
            target_university: sp?.target_university ?? null,
            target_course: sp?.target_course ?? null,
            profile_complete: !!sp?.is_complete,
        }
    })

    const summary = {
        activeStudents: students.length,
        sessionsCompleted: students.reduce((acc, s) => acc + s.sessions_completed, 0),
        upcomingSessions: students.reduce((acc, s) => acc + s.upcoming_sessions, 0),
        pendingReports: students.reduce((acc, s) => acc + s.pending_reports, 0),
    }

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">My Students</h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Track progress and session activity across the students you mentor.
                </p>
            </header>

            <MentorStudentsContent students={students} summary={summary} timezone={timezone} />
        </div>
    )
}
