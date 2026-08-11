import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MentorSessionsContent from './mentor-sessions-content'

export default async function MentorSessionsPage() {
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

    // Fetch all sessions for this mentor
    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            duration_minutes,
            status,
            zoom_start_url,
            zoom_join_url,
            zoom_meeting_status,
            student:profiles!sessions_student_id_fkey (
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .order('scheduled_at', { ascending: false })

    // Check which sessions have reports
    const sessionIds = sessions?.map(s => s.id) || []

    const { data: sessionReports } = sessionIds.length > 0
        ? await supabase
            .from('form_responses')
            .select('session_id')
            .in('session_id', sessionIds)
            .eq('form_type', 'mentor_report')
        : { data: [] }

    const reportSet = new Set(sessionReports?.map(r => r.session_id) || [])

    // Process sessions
    const processedSessions = (sessions || []).map((session: any) => ({
        id: session.id,
        scheduled_at: session.scheduled_at,
        duration_minutes: session.duration_minutes ?? 60,
        status: session.status,
        zoom_start_url: session.zoom_start_url,
        zoom_join_url: session.zoom_join_url,
        zoom_meeting_status: session.zoom_meeting_status,
        student_full_name: session.student?.full_name || 'Student',
        has_report: reportSet.has(session.id)
    }))

    // Pending requests this mentor has sent to students, awaiting their response.
    const { data: pendingRequests } = await supabase
        .from('mentorship_requests')
        .select(`
            id,
            created_at,
            responses,
            reschedule_of_session_id,
            student:profiles!mentorship_requests_student_id_fkey (
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .eq('initiated_by', 'mentor')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    // Also load student-initiated pending reschedules targeting this mentor
    // so we can hide Reschedule on those sessions.
    const { data: incomingReschedules } = await supabase
        .from('mentorship_requests')
        .select('reschedule_of_session_id')
        .eq('mentor_id', user.id)
        .eq('status', 'pending')
        .not('reschedule_of_session_id', 'is', null)

    const processedPendingRequests = (pendingRequests || []).map((req: any) => {
        const slot = req.responses?.timeSlots?.[0] || null
        return {
            id: req.id,
            created_at: req.created_at,
            student_full_name: req.student?.full_name || 'Student',
            proposed_start: slot?.startTime || null,
            proposed_end: slot?.endTime || null,
            note: req.responses?.note || null,
            reschedule_of_session_id: req.reschedule_of_session_id || null,
            original_scheduled_at: req.responses?.original_scheduled_at || null,
        }
    })

    const reschedulePendingSessionIds = [
        ...processedPendingRequests.map((r) => r.reschedule_of_session_id),
        ...(incomingReschedules || []).map((r) => r.reschedule_of_session_id),
    ].filter((id): id is string => !!id)

    // Currently assigned students, for the "Request a Session" modal dropdown.
    const { data: assignments } = await supabase
        .from('student_mentor_assignments')
        .select(`
            student_id,
            student:profiles!student_mentor_assignments_student_id_fkey (
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .eq('is_current', true)

    const assignedStudents = (assignments || []).map((a: any) => ({
        id: a.student_id,
        full_name: a.student?.full_name || 'Student',
    }))

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">
                    My Sessions
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    View your scheduled and completed mentorship sessions
                </p>
            </header>

            <MentorSessionsContent
                sessions={processedSessions}
                pendingRequests={processedPendingRequests}
                reschedulePendingSessionIds={reschedulePendingSessionIds}
                assignedStudents={assignedStudents}
                mentorId={user.id}
                timezone={timezone}
            />
        </div>
    )
}
