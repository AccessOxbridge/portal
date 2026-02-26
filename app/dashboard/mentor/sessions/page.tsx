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

    const now = new Date()

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

    // Session end time = start + booked duration (what student picked)
    const getSessionEndTime = (s: { scheduled_at: string | null; duration_minutes: number }) => {
        if (!s.scheduled_at) return null
        const start = new Date(s.scheduled_at).getTime()
        return new Date(start + s.duration_minutes * 60 * 1000)
    }

    // Upcoming: active, scheduled in the future
    const upcomingSessions = processedSessions.filter(session => {
        if (session.status !== 'active') return false
        if (!session.scheduled_at) return true
        return new Date(session.scheduled_at) > now
    }).sort((a, b) => {
        if (!a.scheduled_at) return 1
        if (!b.scheduled_at) return -1
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    })

    // Current: active, started (scheduled_at <= now) but booked duration not yet over; if they end Zoom early, status becomes 'completed' so it moves to Completed
    const currentSessions = processedSessions.filter(session => {
        if (session.status !== 'active' || !session.scheduled_at) return false
        const start = new Date(session.scheduled_at)
        if (start > now) return false
        const endTime = getSessionEndTime(session)
        if (!endTime || now >= endTime) return false
        return true
    }).sort((a, b) => {
        return new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()
    })

    // Past/Completed: completed, cancelled, or active but past the booked end time
    const pastSessions = processedSessions.filter(session => {
        if (session.status === 'completed' || session.status === 'cancelled') return true
        if (session.status === 'active' && session.scheduled_at) {
            const endTime = getSessionEndTime(session)
            if (endTime && now >= endTime) return true
        }
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

            <MentorSessionsContent
                upcomingSessions={upcomingSessions}
                currentSessions={currentSessions}
                pastSessions={pastSessions}
            />
        </div>
    )
}
