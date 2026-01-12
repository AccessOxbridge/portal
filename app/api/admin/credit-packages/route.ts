import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET all credit packages (for admin)
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

        // Fetch all packages (including inactive)
        const { data: packages, error } = await supabase
            .from('credit_packages')
            .select('*')
            .order('sort_order', { ascending: true })

        if (error) throw error

        return NextResponse.json({ packages })

    } catch (error: any) {
        console.error('Fetch packages error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Create new credit package
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
        const { name, credits, price_cents, currency, description, is_popular, is_active, sort_order } = body

        const { data, error } = await supabase
            .from('credit_packages')
            .insert({
                name,
                credits,
                price_cents,
                currency: currency || 'gbp',
                description,
                is_popular: is_popular || false,
                is_active: is_active !== false,
                sort_order: sort_order || 0
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ package: data })

    } catch (error: any) {
        console.error('Create package error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT - Update credit package
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
            return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('credit_packages')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ package: data })

    } catch (error: any) {
        console.error('Update package error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE - Delete credit package
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
            return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('credit_packages')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete package error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
