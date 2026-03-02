import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST: Cancel all pending mentorship requests for the current student.
 * Sets status to 'rejected' (student withdrew).
 */
export async function POST() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data, error } = await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('student_id', user.id)
            .eq('status', 'pending')
            .select('id')

        if (error) {
            console.error('Cancel pending requests error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const count = data?.length ?? 0
        return NextResponse.json({ success: true, count })
    } catch (e) {
        console.error('Cancel pending requests:', e)
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Failed to cancel requests' },
            { status: 500 }
        )
    }
}
