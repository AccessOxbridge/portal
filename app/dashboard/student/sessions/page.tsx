import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import StudentSessionsContent from './student-sessions-content'

export default async function StudentSessionsPage() {
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

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch all sessions for this student
    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            status,
            zoom_join_url,
            zoom_meeting_status,
            mentor:profiles!sessions_mentor_id_fkey (
                full_name,
                photo_url:mentors(photo_url)
            )
        `)
        .eq('student_id', user.id)
        .order('scheduled_at', { ascending: false })

    // Check which sessions have feedback and reports
    const sessionIds = sessions?.map(s => s.id) || []

    const { data: feedbackResponses } = sessionIds.length > 0
        ? await supabase
            .from('form_responses')
            .select('session_id')
            .in('session_id', sessionIds)
            .eq('form_type', 'student_feedback')
        : { data: [] }

    const { data: sessionReports } = sessionIds.length > 0
        ? await supabase
            .from('session_reports')
            .select('session_id')
            .in('session_id', sessionIds)
        : { data: [] }

    const feedbackSet = new Set(feedbackResponses?.map(f => f.session_id) || [])
    const reportSet = new Set(sessionReports?.map(r => r.session_id) || [])

    const now = new Date()

    // Process sessions
    const processedSessions = (sessions || []).map((session: any) => ({
        id: session.id,
        scheduled_at: session.scheduled_at,
        status: session.status,
        zoom_join_url: session.zoom_join_url,
        zoom_meeting_status: session.zoom_meeting_status,
        mentor_full_name: session.mentor?.full_name || 'Mentor',
        mentor_photo_url: session.mentor?.photo_url?.[0]?.photo_url || null,
        has_feedback: feedbackSet.has(session.id),
        has_report: reportSet.has(session.id)
    }))

    // Split into upcoming and past
    const upcomingSessions = processedSessions.filter(session => {
        if (session.status !== 'active') return false
        if (!session.scheduled_at) return true // Active but no date yet counts as upcoming
        return new Date(session.scheduled_at) > now
    }).sort((a, b) => {
        if (!a.scheduled_at) return 1
        if (!b.scheduled_at) return -1
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    })

    const pastSessions = processedSessions.filter(session => {
        if (session.status === 'completed' || session.status === 'cancelled') return true
        if (session.status === 'active' && session.scheduled_at && new Date(session.scheduled_at) <= now) return true
        return false
    }).sort((a, b) => {
        if (!a.scheduled_at) return 1
        if (!b.scheduled_at) return -1
        return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    })

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

            <StudentSessionsContent
                upcomingSessions={upcomingSessions}
                pastSessions={pastSessions}
            />
        </div>
    )
}
