import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import InPersonEventsContent from './in-person-content'

export default async function InPersonEventsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch in-person events
    const { data: events } = await supabase
        .from('events')
        .select(`
            *,
            registrations:event_registrations(count)
        `)
        .eq('event_type', 'in_person')
        .eq('is_active', true)
        .order('date', { ascending: true })

    // Fetch user's registrations
    const { data: userRegistrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)

    const registeredEventIds = new Set(userRegistrations?.map(r => r.event_id) || [])

    // Transform events with registration info
    const eventsWithRegistration = events?.map(event => ({
        ...event,
        registration_count: event.registrations?.[0]?.count || 0,
        is_registered: registeredEventIds.has(event.id)
    })) || []

    // Split into upcoming and past
    const now = new Date()
    const upcomingEvents = eventsWithRegistration.filter(e => new Date(e.date) > now)
    const pastEvents = eventsWithRegistration.filter(e => new Date(e.date) <= now)

    return (
        <InPersonEventsContent
            upcomingEvents={upcomingEvents}
            pastEvents={pastEvents}
            userId={user.id}
        />
    )
}
