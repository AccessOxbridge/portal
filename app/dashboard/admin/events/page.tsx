import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import EventsManager from './events-manager'

export default async function AdminEventsPage() {
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

    // Fetch all events with registration count
    const { data: events } = await supabase
        .from('events')
        .select(`
            *,
            registrations:event_registrations(count)
        `)
        .order('date', { ascending: true })

    // Transform to include registration count
    const eventsWithCount = events?.map(event => ({
        ...event,
        registration_count: event.registrations?.[0]?.count || 0
    })) || []

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Manage Events
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Create, edit, and manage webinars and in-person events for students
                </p>
            </header>

            <EventsManager initialEvents={eventsWithCount} />
        </div>
    )
}
