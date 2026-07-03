import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sessionAmountCents, DEFAULT_HOURLY_RATE_CENTS } from '@/utils/invoices'

/**
 * GET /api/mentor/invoices/unbilled
 *
 * Returns the current mentor's unbilled sessions — the pool they pick from to
 * generate an invoice (spec §5.1 / §4.3):
 *   mentor_id = me AND (status='completed' OR zoom_meeting_status='ended')
 *   AND invoice_id IS NULL
 *
 * Each row carries the amount computed server-side at the mentor's *current*
 * hourly rate (this is a preview; the rate is snapshotted at invoice generation).
 */
export async function POST() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function GET() {
    try {
        const supabase = await createClient()

        // Auth: caller must be signed in and be a mentor.
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // `db` is untyped because the generated Supabase types don't yet include
        // sessions.invoice_id or the mentor_invoice* tables (regenerate with
        // `supabase gen types typescript`).
        const db = createAdminClient() as unknown as SupabaseClient

        // Mentor's current rate (snapshot happens later, at generation time).
        const { data: mentor } = await db
            .from('mentors')
            .select('hourly_rate_cents')
            .eq('id', user.id)
            .single()

        const hourlyRateCents = mentor?.hourly_rate_cents || DEFAULT_HOURLY_RATE_CENTS

        // Unbilled + finished sessions for this mentor.
        const { data: sessions, error: sessionsError } = await db
            .from('sessions')
            .select('id, scheduled_at, duration_minutes, student_id, status, zoom_meeting_status')
            .eq('mentor_id', user.id)
            .is('invoice_id', null)
            .or('status.eq.completed,zoom_meeting_status.eq.ended')
            .order('scheduled_at', { ascending: true })

        if (sessionsError) throw sessionsError

        const rows = sessions || []

        // Resolve student names in one batched lookup.
        const studentIds = [...new Set(rows.map(s => s.student_id).filter(Boolean))]
        const nameById: Record<string, string> = {}
        if (studentIds.length > 0) {
            const { data: students } = await db
                .from('profiles')
                .select('id, full_name')
                .in('id', studentIds)
            for (const s of students || []) nameById[s.id] = s.full_name || 'Student'
        }

        const unbilled = rows.map(s => ({
            id: s.id,
            scheduled_at: s.scheduled_at,
            duration_minutes: s.duration_minutes ?? 60,
            student_name: nameById[s.student_id] || 'Student',
            amount_cents: sessionAmountCents(s.duration_minutes, hourlyRateCents),
        }))

        return NextResponse.json({
            hourly_rate_cents: hourlyRateCents,
            sessions: unbilled,
        })
    } catch (error: any) {
        console.error('[invoices/unbilled]', error)
        return NextResponse.json(
            { error: error.message || 'Failed to load unbilled sessions' },
            { status: 500 }
        )
    }
}
