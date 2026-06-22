import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import StudentSessionsContent from './student-sessions-content'
import JourneyTimeline from './journey-timeline'

interface StudentSessionsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function StudentSessionsPage({ searchParams }: StudentSessionsPageProps) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, credits')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch full academic profile (for booking modal and journey)
    const { data: academicProfile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const hasProfile = !!(academicProfile?.target_university || academicProfile?.target_course)
    const canBook = !!(academicProfile?.is_complete &&
        academicProfile?.school_name &&
        academicProfile?.timezone &&
        academicProfile?.subjects &&
        Array.isArray(academicProfile.subjects) &&
        academicProfile.subjects.length > 0)

    // A student can only book once an admin has assigned them a mentor.
    const { data: currentAssignment } = await supabase
        .from('student_mentor_assignments')
        .select('mentor_id')
        .eq('student_id', user.id)
        .eq('is_current', true)
        .maybeSingle()

    const hasMentor = !!currentAssignment?.mentor_id

    // Fetch pending mentorship requests
    const { data: pendingRequests } = await supabase
        .from('mentorship_requests')
        .select(`
            id,
            created_at,
            status,
            mentor:profiles!mentorship_requests_mentor_id_fkey (
                full_name
            )
        `)
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    // Fetch all sessions for this student
    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            duration_minutes,
            status,
            zoom_join_url,
            zoom_meeting_status,
            recording_available,
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
        duration_minutes: session.duration_minutes ?? 60,
        status: session.status,
        zoom_join_url: session.zoom_join_url,
        zoom_meeting_status: session.zoom_meeting_status,
        recording_available: !!session.recording_available,
        mentor_full_name: session.mentor?.full_name || 'Mentor',
        mentor_photo_url: session.mentor?.photo_url?.[0]?.photo_url || null,
        has_feedback: feedbackSet.has(session.id),
        has_report: reportSet.has(session.id)
    }))

    // Process pending requests
    const processedPendingRequests = (pendingRequests || []).map((req: any) => ({
        id: req.id,
        created_at: req.created_at,
        mentor_full_name: req.mentor?.full_name || 'Mentor'
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

    // Calculate journey stages
    const hasPendingRequests = processedPendingRequests.length > 0
    const hasActiveMentorship = upcomingSessions.length > 0
    const hasScheduledSession = upcomingSessions.some(s => s.scheduled_at)
    const hasCompletedSession = pastSessions.some(s => s.status === 'completed')
    const completedSessionsCount = pastSessions.filter(s => s.status === 'completed').length

    const resolvedSearchParams = await searchParams
    const autoOpenBooking = resolvedSearchParams?.book === '1'

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    My Sessions
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Track your mentorship journey and sessions
                </p>
            </header>

            <JourneyTimeline
                hasProfile={hasProfile}
                hasPendingRequests={hasPendingRequests}
                hasActiveMentorship={hasActiveMentorship}
                hasScheduledSession={hasScheduledSession}
                hasCompletedSession={hasCompletedSession}
                completedSessionsCount={completedSessionsCount}
            />

            <StudentSessionsContent
                sessions={processedSessions}
                pendingRequests={processedPendingRequests}
                credits={profile?.credits || 0}
                canBook={canBook}
                hasMentor={hasMentor}
                autoOpenBooking={autoOpenBooking}
                studentId={user.id}
                timezone={academicProfile?.timezone ?? null}
            />
        </div>
    )
}
