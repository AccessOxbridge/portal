import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// POST - Register for an event
export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { event_id } = body

        if (!event_id) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
        }

        // Check if event exists and is active
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, capacity')
            .eq('id', event_id)
            .eq('is_active', true)
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Check capacity
        if (event.capacity) {
            const { count } = await supabase
                .from('event_registrations')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event_id)

            if (count && count >= event.capacity) {
                return NextResponse.json({ error: 'Event is full' }, { status: 400 })
            }
        }

        // Register user
        const { data, error } = await supabase
            .from('event_registrations')
            .insert({
                event_id,
                user_id: user.id
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ error: 'Already registered' }, { status: 400 })
            }
            throw error
        }

        return NextResponse.json({ registration: data })

    } catch (error: any) {
        console.error('Registration error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE - Unregister from an event
export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { event_id } = body

        if (!event_id) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('event_registrations')
            .delete()
            .eq('event_id', event_id)
            .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Unregistration error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
