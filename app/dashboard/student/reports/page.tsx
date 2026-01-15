import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ReportsContent from './reports-content'

export default async function StudentReportsPage() {
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

    // Fetch all sessions with reports for this student
    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            mentor:profiles!sessions_mentor_id_fkey (
                full_name,
                photo_url:mentors(photo_url)
            ),
            session_reports (
                id,
                summary,
                key_points,
                action_items,
                personalized_report,
                personalized_report_generated_at,
                created_at
            )
        `)
        .eq('student_id', user.id)
        .not('session_reports', 'is', null)
        .order('scheduled_at', { ascending: false })

    // Process sessions with reports
    const reportsData = (sessions || [])
        .filter((session: any) => session.session_reports && session.session_reports.length > 0)
        .map((session: any) => ({
            session_id: session.id,
            scheduled_at: session.scheduled_at,
            mentor_full_name: session.mentor?.full_name || 'Mentor',
            mentor_photo_url: session.mentor?.photo_url?.[0]?.photo_url || null,
            report: session.session_reports[0]
        }))

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Session Reports
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    View personalized reports and insights from your mentorship sessions
                </p>
            </header>

            <ReportsContent reports={reportsData} />
        </div>
    )
}
