import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import ManageSessionsTable from './manage-sessions-table'
import AdminBookSessionModal from './admin-book-session-modal'

export default async function AdminManageSessionsPage() {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

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

    const { data: sessions } = await adminSupabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            status,
            student_id,
            mentor_id,
            duration_minutes,
            student:profiles!sessions_student_id_fkey (
                full_name
            ),
            mentor:profiles!sessions_mentor_id_fkey (
                full_name
            )
        `)
        .order('scheduled_at', { ascending: false })

    const { data: mentors } = await adminSupabase
        .from('mentors')
        .select(`
            id,
            status,
            profile:profiles!mentors_id_fkey (
                full_name
            )
        `)

    const mentorOptions = (mentors || [])
        .filter((m: any) => m.profile?.full_name)
        .map((m: any) => ({
            id: m.id as string,
            name: m.profile.full_name as string,
        }))

    const tableSessions = (sessions || []).map((s: any) => ({
        id: s.id as string,
        scheduledAt: s.scheduled_at as string | null,
        status: s.status as string,
        studentName: s.student?.full_name || 'Unknown student',
        studentId: s.student_id as string,
        mentorName: s.mentor?.full_name || 'Unassigned mentor',
        mentorId: s.mentor_id as string,
    }))

    const { data: assignments } = await adminSupabase
        .from('student_mentor_assignments')
        .select(`
            student_id,
            mentor_id,
            student:profiles!student_mentor_assignments_student_id_fkey ( full_name ),
            mentor:profiles!student_mentor_assignments_mentor_id_fkey ( full_name )
        `)
        .eq('is_current', true)

    const mentorIds = Array.from(new Set((assignments || []).map((a: any) => a.mentor_id as string)))

    const { data: mentorTzRows } = mentorIds.length
        ? await adminSupabase
            .from('mentors')
            .select('id, timezone')
            .in('id', mentorIds)
        : { data: [] as { id: string; timezone: string | null }[] }

    const mentorTzById = new Map(
        (mentorTzRows || []).map((m: any) => [m.id as string, m.timezone as string | null])
    )

    const assignedPairs = (assignments || [])
        .filter((a: any) => a.student?.full_name && a.mentor?.full_name)
        .map((a: any) => ({
            studentId: a.student_id as string,
            studentName: a.student.full_name as string,
            mentorId: a.mentor_id as string,
            mentorName: a.mentor.full_name as string,
            mentorTimezone: mentorTzById.get(a.mentor_id as string) ?? null,
        }))

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
                <div>
                    <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                        Manage Sessions
                    </h1>
                    <p className="mt-3 text-gray-500 text-lg">
                        View all mentorship sessions and manually reassign mentors when needed.
                        Students remain fixed; you can only change the assigned mentor.
                    </p>
                </div>
                <AdminBookSessionModal assignedPairs={assignedPairs} />
            </header>

            <ManageSessionsTable sessions={tableSessions} mentors={mentorOptions} />
        </div>
    )
}

