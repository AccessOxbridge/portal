import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import AdminSessionsTable from './sessions-table'

export default async function AdminSessionsPage() {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

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

    const { data: sessions } = await adminSupabase
        .from('sessions')
        .select('id, scheduled_at, status, zoom_meeting_status, transcript_url, student_id, mentor_id')
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })

    const studentIds = [...new Set((sessions || []).map(s => s.student_id).filter(Boolean))] as string[]
    const mentorIds = [...new Set((sessions || []).map(s => s.mentor_id).filter(Boolean))] as string[]
    const allIds = [...new Set([...studentIds, ...mentorIds])]

    let profileMap = new Map<string, string>()
    if (allIds.length > 0) {
        const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id, full_name')
            .in('id', allIds)
        profileMap = new Map(profiles?.map(p => [p.id, p.full_name || 'Unknown']) || [])
    }

    const tableData = (sessions || []).map(s => ({
        id: s.id,
        scheduledAt: s.scheduled_at,
        studentName: profileMap.get(s.student_id) || 'Unknown',
        mentorName: profileMap.get(s.mentor_id) || 'Unknown',
        transcriptUrl: s.transcript_url,
    }))

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Session Transcripts
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    View transcripts for completed sessions (for safety and compliance)
                </p>
            </header>

            <AdminSessionsTable sessions={tableData} />
        </div>
    )
}
