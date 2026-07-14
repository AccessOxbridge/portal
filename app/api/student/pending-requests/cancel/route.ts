import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { notifyRescheduleDeclined } from '@/lib/session-reschedule'

/**
 * POST: Cancel all pending mentorship requests *the student initiated* for
 * the current student. Sets status to 'rejected' (student withdrew).
 * Mentor-initiated pending requests are handled individually via
 * Accept/Decline on their own card, not by this bulk-cancel action.
 *
 * Reschedule withdrawals also email both parties that the original session
 * still stands.
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

        const { data: pendingBefore } = await supabase
            .from('mentorship_requests')
            .select('id, mentor_id, student_id, reschedule_of_session_id, responses')
            .eq('student_id', user.id)
            .eq('status', 'pending')
            .eq('initiated_by', 'student')

        const { data, error } = await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('student_id', user.id)
            .eq('status', 'pending')
            .eq('initiated_by', 'student')
            .select('id')

        if (error) {
            console.error('Cancel pending requests error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        for (const req of pendingBefore || []) {
            if (!req.reschedule_of_session_id) continue
            const responses = (req.responses || {}) as { original_scheduled_at?: string }
            let originalScheduledAt = responses.original_scheduled_at ?? null
            if (!originalScheduledAt) {
                const { data: session } = await supabase
                    .from('sessions')
                    .select('scheduled_at')
                    .eq('id', req.reschedule_of_session_id)
                    .maybeSingle()
                originalScheduledAt = session?.scheduled_at ?? null
            }
            await notifyRescheduleDeclined({
                supabase,
                studentId: req.student_id,
                mentorId: req.mentor_id,
                originalScheduledAt,
                withdrawnByProposer: true,
            })
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
