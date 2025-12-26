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

    // Flatten mentor name if exists
    const sessionWithMentor = activeSession ? {
        ...activeSession,
        mentor_full_name: (activeSession.mentor as any)?.full_name
    } : null

    return (
        <StudentDashboardContent
            profile={profile}
            activeSession={sessionWithMentor}
            pendingRequests={pendingRequests || []}
        />
    )
}
