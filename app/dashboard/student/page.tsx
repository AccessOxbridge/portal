import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getGreetingName } from '@/utils/lib'
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

    // Fetch active sessions (newest first); pick only upcoming/unscheduled
    const { data: activeSessions } = await supabase
        .from('sessions')
        .select(`
            *,
            mentor:profiles!sessions_mentor_id_fkey (
                full_name
            )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('scheduled_at', { ascending: true })
        .limit(20)

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
        .limit(15)

    const nowDate = new Date()
    const sessionToShow = (activeSessions || []).find((session: any) => {
        if (!session.scheduled_at) return true
        return new Date(session.scheduled_at) >= nowDate
    }) || null

    // Flatten mentor name if exists
    const sessionWithMentor = sessionToShow ? {
        ...sessionToShow,
        mentor_full_name: (sessionToShow.mentor as any)?.full_name
    } : null

    // Process upcoming sessions
    const processedUpcomingSessions = (upcomingSessions || []).map((session: any) => ({
        id: session.id,
        scheduled_at: session.scheduled_at,
        zoom_join_url: session.zoom_join_url,
        mentor_full_name: session.mentor?.full_name || 'Mentor'
    }))

    // Fetch student academic profile (full for booking modal)
    const { data: academicProfile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Current assigned mentor (booking requires one)
    const { data: currentAssignment } = await supabase
        .from('student_mentor_assignments')
        .select('mentor_id')
        .eq('student_id', user.id)
        .eq('is_current', true)
        .maybeSingle()

    const hasMentor = !!currentAssignment?.mentor_id

    // Count sessions booked this week (Mon–Sun)
    const weekStart = new Date()
    const dayOfWeek = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const { count: sessionsThisWeekCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .in('status', ['active', 'completed'])
        .gte('scheduled_at', weekStart.toISOString())
        .lt('scheduled_at', weekEnd.toISOString())

    const greetingName = getGreetingName(
        profile.full_name,
        user.user_metadata?.full_name as string | undefined,
        user.email
    )

    return (
        <StudentDashboardContent
            profile={profile}
            activeSession={sessionWithMentor}
            pendingRequests={pendingRequests || []}
            upcomingSessions={processedUpcomingSessions}
            academicProfile={academicProfile as any}
            hasMentor={hasMentor}
            userId={user.id}
            userName={greetingName}
            greetingName={greetingName}
            sessionsThisWeek={sessionsThisWeekCount ?? 0}
            timezone={academicProfile?.timezone ?? null}
        />
    )
}

