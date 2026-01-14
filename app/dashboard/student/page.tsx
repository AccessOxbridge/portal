import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import StudentDashboardContent from './student-dashboard-content'

export default async function StudentDashboard() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch pending requests
    const { data: pendingRequests } = await supabase
        .from('mentorship_requests')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'pending')

    // Fetch active sessions
    const { data: activeSession } = await supabase
        .from('sessions')
        .select(`
            *,
            mentor:profiles!sessions_mentor_id_fkey (
                full_name
            )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

    // Fetch upcoming sessions (active sessions with future scheduled_at)
    const now = new Date().toISOString()
    const { data: upcomingSessions } = await supabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            zoom_join_url,
            mentor:profiles!sessions_mentor_id_fkey (
                full_name
            )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(3)

    // Flatten mentor name if exists
    const sessionWithMentor = activeSession ? {
        ...activeSession,
        mentor_full_name: (activeSession.mentor as any)?.full_name
    } : null

    // Process upcoming sessions
    const processedUpcomingSessions = (upcomingSessions || []).map((session: any) => ({
        id: session.id,
        scheduled_at: session.scheduled_at,
        zoom_join_url: session.zoom_join_url,
        mentor_full_name: session.mentor?.full_name || 'Mentor'
    }))

    return (
        <StudentDashboardContent
            profile={profile}
            activeSession={sessionWithMentor}
            pendingRequests={pendingRequests || []}
            upcomingSessions={processedUpcomingSessions}
        />
    )
}

