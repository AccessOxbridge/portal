import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import WebinarsContent from './webinars-content'

export default async function WebinarsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch webinar events
    const { data: webinars } = await supabase
        .from('events')
        .select(`
            *,
            registrations:event_registrations(count)
        `)
        .eq('event_type', 'webinar')
        .eq('is_active', true)
        .order('date', { ascending: true })

    // Fetch user's registrations
    const { data: userRegistrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)

    const registeredEventIds = new Set(userRegistrations?.map(r => r.event_id) || [])

    // Transform events with registration info
    const eventsWithRegistration = webinars?.map(event => ({
        ...event,
        registration_count: event.registrations?.[0]?.count || 0,
        is_registered: registeredEventIds.has(event.id)
    })) || []

    // Split into upcoming and past
    const now = new Date()
    const upcomingWebinars = eventsWithRegistration.filter(e => new Date(e.date) > now)
    const pastWebinars = eventsWithRegistration.filter(e => new Date(e.date) <= now)

    return (
        <WebinarsContent
            upcomingWebinars={upcomingWebinars}
            pastWebinars={pastWebinars}
            userId={user.id}
        />
    )
}
