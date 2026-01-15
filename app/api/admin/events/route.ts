import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET all events (for admin)
export async function GET() {
    try {
        const supabase = await createClient()

        // Check if user is admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Fetch all events with registration count
        const { data: events, error } = await supabase
            .from('events')
            .select(`
                *,
                registrations:event_registrations(count)
            `)
            .order('date', { ascending: true })

        if (error) throw error

        // Transform to include registration count
        const eventsWithCount = events?.map(event => ({
            ...event,
            registration_count: event.registrations?.[0]?.count || 0
        }))

        return NextResponse.json({ events: eventsWithCount })

    } catch (error: any) {
        console.error('Fetch events error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Create new event
export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // Check admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const {
            title,
            description,
            event_type,
            date,
            end_time,
            duration_minutes,
            location,
            meeting_url,
            host,
            capacity,
            is_active,
            sort_order,
            recording_url
        } = body

        const { data, error } = await supabase
            .from('events')
            .insert({
                title,
                description,
                event_type,
                date,
                end_time,
                duration_minutes,
                location,
                meeting_url,
                host,
                capacity,
                is_active: is_active !== false,
                sort_order: sort_order || 0,
                recording_url
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ event: data })

    } catch (error: any) {
        console.error('Create event error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT - Update event
export async function PUT(req: Request) {
    try {
        const supabase = await createClient()

        // Check admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ event: data })

    } catch (error: any) {
        console.error('Update event error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE - Delete event
export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()

        // Check admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete event error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
