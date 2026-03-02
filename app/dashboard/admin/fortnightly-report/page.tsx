import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FortnightlyReportContent from './fortnightly-report-content'
import { getFortnightWindowForDate } from '@/lib/fortnight'
import { createAdminClient } from '@/utils/supabase/admin'

export default async function FortnightlyReportPage() {
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

    const now = new Date()
    const { startDate, endDate } = getFortnightWindowForDate(now)
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()

    const { data: sessions } = await adminSupabase
        .from('sessions')
        .select('id, student_id, scheduled_at')
        .gte('scheduled_at', startIso)
        .lte('scheduled_at', endIso)
        .order('scheduled_at', { ascending: false })

    const studentIds = [...new Set((sessions || []).map(s => s.student_id))]
    let students: { id: string; full_name: string; email: string | null; parent_email: string | null; sessionCount: number }[] = []

    if (studentIds.length > 0) {
        const sessionCountByStudent = (sessions || []).reduce<Record<string, number>>((acc, s) => {
            acc[s.student_id] = (acc[s.student_id] || 0) + 1
            return acc
        }, {})

        const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds)

        const { data: studentProfiles } = await adminSupabase
            .from('student_profiles')
            .select('id, parent_email')
            .in('id', studentIds)

        const parentEmailMap = new Map((studentProfiles || []).map(sp => [sp.id, sp.parent_email]))

        students = (profiles || []).map(p => ({
            id: p.id,
            full_name: p.full_name || 'Unknown',
            email: p.email,
            parent_email: parentEmailMap.get(p.id) || null,
            sessionCount: sessionCountByStudent[p.id] || 0
        }))
    }

    const periodLabel = `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} – ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Fortnightly Report
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Generate and send a consolidated AI report of the current 14-day period to students and parents via email
                </p>
                <div className="mt-4 flex gap-4 text-sm">
                    <div className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg font-medium">
                        Period: {periodLabel}
                    </div>
                    <div className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-medium">
                        {students.length} student{students.length !== 1 ? 's' : ''} with sessions
                    </div>
                </div>
            </header>

            <FortnightlyReportContent
                students={students}
                defaultEndDate={endDate.toISOString().slice(0, 10)}
            />
        </div>
    )
}
