import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MentorReportsContent from './reports-content'

export default async function MentorReportsPage() {
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

    // Fetch all ended/completed sessions for this mentor
    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            status,
            zoom_meeting_status,
            student:profiles!sessions_student_id_fkey (
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .order('scheduled_at', { ascending: false })

    // Get all mentor reports submitted by this mentor
    const { data: submittedReports } = await supabase
        .from('form_responses')
        .select('session_id, created_at')
        .eq('respondent_id', user.id)
        .eq('form_type', 'mentor_report')

    const submittedSessionIds = new Set(submittedReports?.map(r => r.session_id) || [])

    // Create a map of session_id to submission date
    const submissionDates = new Map(
        submittedReports?.map(r => [r.session_id, r.created_at]) || []
    )

    const now = new Date()

    // Process sessions into to-complete and completed categories
    const processedSessions = (sessions || []).map((session: any) => ({
        id: session.id,
        scheduled_at: session.scheduled_at,
        status: session.status,
        zoom_meeting_status: session.zoom_meeting_status,
        student_full_name: session.student?.full_name || 'Student',
        has_report: submittedSessionIds.has(session.id),
        submitted_at: submissionDates.get(session.id) || null
    }))

    // Sessions that need reports: completed/ended sessions without reports
    const toComplete = processedSessions.filter(session => {
        // Session must be past or ended
        const isPast = session.scheduled_at && new Date(session.scheduled_at) < now
        const isEnded = session.zoom_meeting_status === 'ended' || session.status === 'completed'
        return (isPast || isEnded) && !session.has_report
    }).sort((a, b) => {
        // Most recent first (they need attention)
        if (!a.scheduled_at) return 1
        if (!b.scheduled_at) return -1
        return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    })

    // Completed reports
    const completed = processedSessions.filter(session => session.has_report)
        .sort((a, b) => {
            // Most recently submitted first
            if (!a.submitted_at) return 1
            if (!b.submitted_at) return -1
            return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        })

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">
                    Session Reports
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Submit reports after each session to help generate personalised feedback for students
                </p>
            </header>

            <MentorReportsContent
                toComplete={toComplete}
                completed={completed}
            />
        </div>
    )
}
