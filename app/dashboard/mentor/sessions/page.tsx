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

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    My Sessions
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    View your scheduled and completed mentorship sessions
                </p>
            </header>

            <MentorSessionsContent
                sessions={processedSessions}
                mentorId={user.id}
            />
        </div>
    )
}
