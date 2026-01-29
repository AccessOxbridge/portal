import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import IssuesTable from './issues-table'

export default async function AdminIssuesPage() {
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

    // Fetch all issues
    const { data: issues } = await supabase
        .from('user_issues')
        .select('*')
        .order('created_at', { ascending: false })

    // Get reporter profiles
    const reporterIds = [...new Set(issues?.map(i => i.reporter_id).filter(Boolean))] as string[]
    let profileMap = new Map<string, { full_name: string | null; email: string | null; role: string | null }>()

    if (reporterIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('id', reporterIds)

        profileMap = new Map(profiles?.map(p => [p.id, {
            full_name: p.full_name,
            email: p.email,
            role: p.role
        }]) || [])
    }

    // Transform data for table
    const tableData = issues?.map(issue => {
        const reporterProfile = profileMap.get(issue.reporter_id)
        return {
            id: issue.id,
            reporter_id: issue.reporter_id,
            reporter_name: reporterProfile?.full_name || 'Unknown',
            reporter_email: reporterProfile?.email || '',
            reporter_type: issue.reporter_type,
            issue_type: issue.issue_type,
            subject: issue.subject,
            description: issue.description,
            status: issue.status,
            priority: issue.priority,
            admin_notes: issue.admin_notes,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
        }
    }) || []

    // Count by status
    const openCount = tableData.filter(i => i.status === 'open').length
    const inProgressCount = tableData.filter(i => i.status === 'in_progress').length
    const resolvedCount = tableData.filter(i => i.status === 'resolved' || i.status === 'closed').length

    return (
        <div className="max-w-7xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    User Issues
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    View and manage issues reported by mentors and students
                </p>
                <div className="mt-4 flex gap-4 text-sm">
                    <div className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium">
                        {openCount} Open
                    </div>
                    <div className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-medium">
                        {inProgressCount} In Progress
                    </div>
                    <div className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg font-medium">
                        {resolvedCount} Resolved
                    </div>
                </div>
            </header>

            <IssuesTable issues={tableData} />
        </div>
    )
}
