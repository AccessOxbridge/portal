import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import WeeklyCalendar from '@/components/dashboard/weekly-calendar'

export default async function MentorAvailabilityPage() {
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

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch all upcoming sessions for this mentor
    const now = new Date().toISOString()
    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            zoom_start_url,
            student:profiles!sessions_student_id_fkey (
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .eq('status', 'active')
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(30)

    // Process sessions for the calendar
    const processedSessions = (sessions || []).map((session: any) => ({
        id: session.id,
        scheduled_at: session.scheduled_at,
        // Route through the on-demand start endpoint so the mentor always gets
        // a fresh (non-expired) Zoom host link.
        zoom_url: session.zoom_start_url ? `/api/sessions/${session.id}/start` : null,
        person_name: session.student?.full_name || 'Student'
    }))

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    My Availability
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    View your scheduled sessions and check your availability
                </p>
            </header>

            <WeeklyCalendar
                sessions={processedSessions}
                personLabel="Student"
                zoomButtonLabel="Start Zoom"
            />
        </div>
    )
}
