import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { notifyRescheduleDeclined } from '@/lib/session-reschedule'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const { requestId } = body

        if (!requestId || typeof requestId !== 'string') {
            return NextResponse.json({ error: 'Missing requestId.' }, { status: 400 })
        }

        const { data: existing } = await supabase
            .from('mentorship_requests')
            .select('id, mentor_id, student_id, reschedule_of_session_id, responses')
            .eq('id', requestId)
            .eq('mentor_id', user.id)
            .eq('initiated_by', 'mentor')
            .eq('status', 'pending')
            .maybeSingle()

        if (!existing) {
            return NextResponse.json(
                { error: 'Request not found or already resolved.' },
                { status: 404 }
            )
        }

        const { error, data } = await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId)
            .eq('mentor_id', user.id)
            .eq('initiated_by', 'mentor')
            .eq('status', 'pending')
            .select('id')

        if (error) throw error

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'Request not found or already resolved.' },
                { status: 404 }
            )
        }

        if (existing.reschedule_of_session_id) {
            const responses = (existing.responses || {}) as { original_scheduled_at?: string }
            let originalScheduledAt = responses.original_scheduled_at ?? null
            if (!originalScheduledAt) {
                const { data: session } = await supabase
                    .from('sessions')
                    .select('scheduled_at')
                    .eq('id', existing.reschedule_of_session_id)
                    .maybeSingle()
                originalScheduledAt = session?.scheduled_at ?? null
            }
            await notifyRescheduleDeclined({
                supabase,
                studentId: existing.student_id,
                mentorId: existing.mentor_id,
                originalScheduledAt,
                withdrawnByProposer: true,
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        console.error('Cancel mentor pending request error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        )
    }
}
