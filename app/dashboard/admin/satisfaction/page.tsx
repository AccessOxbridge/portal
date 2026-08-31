import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import SatisfactionOverview, { type SatisfactionRow } from './satisfaction-overview'

/**
 * Admin view of the every-4-sessions student satisfaction check-in.
 *
 * Reads only. Mirrors the auth-then-service-role shape of the feedbacks page:
 * the caller is checked against `profiles.role` through the RLS client first,
 * and only then do we read through the service-role client so student names
 * resolve (`profiles` has no blanket admin SELECT policy).
 */
export default async function AdminSatisfactionPage() {
    const supabase = await createClient()

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

    const db = createAdminClient()

    const { data: surveys } = await db
        .from('student_satisfaction_surveys')
        .select(
            'student_id, session_count, sessions_completed, portal_rating, mentoring_rating, progress_rating, comment, submitted_at'
        )
        .order('submitted_at', { ascending: false })

    const studentIds = [...new Set((surveys || []).map((s) => s.student_id))]

    let studentMap = new Map<string, string | null>()
    if (studentIds.length > 0) {
        const { data: students } = await db
            .from('profiles')
            .select('id, full_name')
            .in('id', studentIds)
        studentMap = new Map((students || []).map((s) => [s.id, s.full_name]))
    }

    const rows: SatisfactionRow[] = (surveys || []).map((s) => ({
        studentId: s.student_id,
        studentName: studentMap.get(s.student_id) || 'Unknown',
        sessionCount: s.session_count,
        sessionsCompleted: s.sessions_completed,
        portal: s.portal_rating,
        mentoring: s.mentoring_rating,
        progress: s.progress_rating,
        comment: s.comment,
        submittedAt: s.submitted_at,
    }))

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">
                    Student Satisfaction
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    The check-in students answer every 4 completed sessions.
                </p>
            </div>

            <SatisfactionOverview rows={rows} />
        </div>
    )
}
