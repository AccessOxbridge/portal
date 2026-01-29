import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Create a new issue
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        const reporterType = profile.role === 'mentor' ? 'mentor' : 'student'

        const body = await request.json()
        const { issue_type, subject, description, payout_id, session_id } = body

        if (!issue_type || !subject || !description) {
            return NextResponse.json(
                { error: 'Missing required fields: issue_type, subject, description' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('user_issues')
            .insert({
                reporter_id: user.id,
                reporter_type: reporterType,
                issue_type,
                subject,
                description,
                payout_id: payout_id || null,
                session_id: session_id || null,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating issue:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, issue: data })
    } catch (error) {
        console.error('Error in POST /api/user-issues:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// GET: List issues (filtered by reporter for non-admins)
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        const isAdmin = ['admin', 'admin-dev'].includes(profile.role)

        let query = supabase
            .from('user_issues')
            .select('*')
            .order('created_at', { ascending: false })

        // Non-admins can only see their own issues
        if (!isAdmin) {
            query = query.eq('reporter_id', user.id)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching issues:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ issues: data })
    } catch (error) {
        console.error('Error in GET /api/user-issues:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH: Update issue status (admin only)
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

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
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { issue_id, status, admin_notes, priority } = body

        if (!issue_id) {
            return NextResponse.json({ error: 'issue_id is required' }, { status: 400 })
        }

        const updateData: any = { updated_at: new Date().toISOString() }

        if (status) {
            updateData.status = status
            if (status === 'resolved' || status === 'closed') {
                updateData.resolved_by = user.id
                updateData.resolved_at = new Date().toISOString()
            }
        }
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes
        if (priority) updateData.priority = priority

        const { data, error } = await supabase
            .from('user_issues')
            .update(updateData)
            .eq('id', issue_id)
            .select()
            .single()

        if (error) {
            console.error('Error updating issue:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, issue: data })
    } catch (error) {
        console.error('Error in PATCH /api/user-issues:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
