import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminReportsTable from './reports-table'

export default async function AdminReportsPage() {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
        redirect('/dashboard')
    }

    // Fetch all session reports with session info
    const { data: reports } = await supabase
        .from('session_reports')
        .select(`
            id,
            summary,
            key_points,
            action_items,
            personalized_report,
            personalized_report_generated_at,
            created_at,
            session_id,
            sessions (
                id,
                scheduled_at,
                status,
                zoom_meeting_status,
                student_id,
                mentor_id
            )
        `)
        .order('created_at', { ascending: false })

    // Get unique student and mentor IDs
    const studentIds = [...new Set(reports?.map(r => (r.sessions as any)?.student_id).filter(Boolean))] as string[]
    const mentorIds = [...new Set(reports?.map(r => (r.sessions as any)?.mentor_id).filter(Boolean))] as string[]
    const allUserIds = [...new Set([...studentIds, ...mentorIds])]

    // Fetch all profiles at once
    let profileMap = new Map<string, { full_name: string | null; email: string | null }>()
    if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', allUserIds)

        profileMap = new Map(profiles?.map(p => [p.id, { full_name: p.full_name, email: p.email }]) || [])
    }

    // Also get mentor report form responses (for additional context)
    const sessionIds = reports?.map(r => r.session_id).filter(Boolean) || []
    let mentorReportMap = new Map<string, { submitted_at: string | null; responses: any }>()

    if (sessionIds.length > 0) {
        const { data: mentorReports } = await supabase
            .from('form_responses')
            .select('session_id, created_at, responses')
            .eq('form_type', 'mentor_report')
            .in('session_id', sessionIds)

        mentorReportMap = new Map(mentorReports?.map(r => [
            r.session_id,
            { submitted_at: r.created_at, responses: r.responses }
        ]) || [])
    }

    // Transform data for table
    const tableData = reports?.map(report => {
        const session = report.sessions as any
        const studentProfile = session?.student_id ? profileMap.get(session.student_id) : null
        const mentorProfile = session?.mentor_id ? profileMap.get(session.mentor_id) : null
        const mentorFormResponse = mentorReportMap.get(report.session_id)

        return {
            id: report.id,
            session_id: report.session_id,
            student_name: studentProfile?.full_name || 'Unknown Student',
            student_email: studentProfile?.email || '',
            mentor_name: mentorProfile?.full_name || 'Unknown Mentor',
            mentor_email: mentorProfile?.email || '',
            session_date: session?.scheduled_at || null,
            session_status: session?.status || 'unknown',
            summary: report.summary,
            key_points: report.key_points as string[] | null,
            action_items: report.action_items as string[] | null,
            personalized_report: report.personalized_report,
            personalized_report_generated_at: report.personalized_report_generated_at,
            mentor_form_submitted_at: mentorFormResponse?.submitted_at || null,
            mentor_form_responses: mentorFormResponse?.responses || null,
            created_at: report.created_at
        }
    }) || []

    return (
        <div className="max-w-7xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Session Reports
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    View all session reports generated for student-mentor sessions
                </p>
                <div className="mt-4 flex gap-4 text-sm">
                    <div className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg font-medium">
                        {tableData.length} Total Reports
                    </div>
                    <div className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg font-medium">
                        {tableData.filter(r => r.personalized_report).length} With Personalized Reports
                    </div>
                </div>
            </header>

            <AdminReportsTable reports={tableData} />
        </div>
    )
}
