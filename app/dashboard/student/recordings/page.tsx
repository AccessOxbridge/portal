import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import StudentRecordingsContent from './recordings-content'

export default async function StudentRecordingsPage() {
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

    const { data: academicProfile } = await supabase
        .from('student_profiles')
        .select('timezone')
        .eq('id', user.id)
        .single()

    // Only sessions that have a captured recording.
    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            duration_minutes,
            recording_available,
            mentor:profiles!sessions_mentor_id_fkey (
                full_name,
                photo_url:mentors(photo_url)
            )
        `)
        .eq('student_id', user.id)
        .eq('recording_available', true)
        .order('scheduled_at', { ascending: false, nullsFirst: false })

    const recordings = (sessions || []).map((session: any) => ({
        id: session.id,
        scheduled_at: session.scheduled_at,
        duration_minutes: session.duration_minutes ?? 60,
        mentor_full_name: session.mentor?.full_name || 'Mentor',
        mentor_photo_url: session.mentor?.photo_url?.[0]?.photo_url || null,
    }))

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">
                    Session Recordings
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Rewatch your past mentor sessions
                </p>
            </header>

            <StudentRecordingsContent
                recordings={recordings}
                timezone={academicProfile?.timezone ?? null}
            />
        </div>
    )
}
