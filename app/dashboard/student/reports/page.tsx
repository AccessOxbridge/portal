import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ReportsContent from './reports-content'
import { getMentorPhotoUrl } from '@/lib/mentor-photo'

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
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            mentor_id,
            scheduled_at,
            mentor:profiles!sessions_mentor_id_fkey (
                full_name,
                photo_url:mentors(photo_url)
            )
        `)
        .eq('student_id', user.id)
        .order('scheduled_at', { ascending: false })

    const sessionIds = (sessions || []).map((s: any) => s.id)
    const { data: reports } = sessionIds.length > 0
        ? await supabase
            .from('session_reports')
            .select(`
                id,
                session_id,
                summary,
                key_points,
                action_items,
                personalized_report,
                personalized_report_generated_at,
                created_at
            `)
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false })
        : { data: [] as any[] }

    const sessionById = new Map(
        (sessions || []).map((session: any) => [session.id, session])
    )

    const reportsData = (reports || [])
        .map((item: any) => {
            const session = sessionById.get(item.session_id)
            if (!session) return null
            return {
                session_id: session.id,
                scheduled_at: session.scheduled_at,
                mentor_id: session.mentor_id,
                mentor_full_name: session.mentor?.full_name || 'Mentor',
                mentor_photo_url: getMentorPhotoUrl(session.mentor),
                report: {
                    id: item.id,
                    summary: item.summary,
                    key_points: item.key_points,
                    action_items: item.action_items,
                    personalized_report: item.personalized_report,
                    personalized_report_generated_at: item.personalized_report_generated_at,
                    created_at: item.created_at
                }
            }
        })
        .filter(Boolean) as any[]

    const studentFirstName =
        typeof profile?.full_name === 'string'
            ? profile.full_name.trim().split(' ')[0] || null
            : null

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">
                    Session Reports
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    View personalised reports and insights from your mentorship sessions
                </p>
            </header>

            <ReportsContent reports={reportsData} studentFirstName={studentFirstName || undefined} />
        </div>
    )
}
