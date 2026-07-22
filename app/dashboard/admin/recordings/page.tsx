import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import AdminRecordingsContent, { type SessionBatch } from './recordings-content'

export default async function AdminRecordingsPage() {
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
            duration_minutes,
            status,
            student_id,
            mentor_id,
            recording_available,
            student:profiles!sessions_student_id_fkey (
                full_name
            ),
            mentor:profiles!sessions_mentor_id_fkey (
                full_name
            )
        `)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })

    const batchMap = new Map<string, SessionBatch>()

    for (const session of sessions || []) {
        const studentId = session.student_id as string
        const mentorId = session.mentor_id as string
        const key = `${studentId}:${mentorId}`
        const studentName =
            (session.student as { full_name: string | null } | null)?.full_name || 'Unknown student'
        const mentorName =
            (session.mentor as { full_name: string | null } | null)?.full_name || 'Unknown mentor'

        if (!batchMap.has(key)) {
            batchMap.set(key, {
                key,
                studentId,
                mentorId,
                studentName,
                mentorName,
                sessions: [],
            })
        }

        batchMap.get(key)!.sessions.push({
            id: session.id,
            scheduledAt: session.scheduled_at,
            durationMinutes: session.duration_minutes ?? 60,
            recordingAvailable: session.recording_available ?? false,
        })
    }

    const batches = Array.from(batchMap.values()).sort((a, b) => {
        const aDate = a.sessions[0]?.scheduledAt || ''
        const bDate = b.sessions[0]?.scheduledAt || ''
        return bDate.localeCompare(aDate)
    })

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Session Recordings
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Completed sessions grouped by student–mentor pair, with video when available
                </p>
            </header>

            <AdminRecordingsContent batches={batches} />
        </div>
    )
}
