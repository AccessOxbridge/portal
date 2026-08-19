import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import {
    sessionAmountCents,
    DEFAULT_HOURLY_RATE_CENTS,
} from '@/utils/invoices'
import SessionPayoutsTable from './session-payouts-table'

export default async function AdminSessionPayoutsPage() {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
        redirect('/dashboard')
    }

    // Finished (payable) sessions only — same rule as mentor unbilled.
    const { data: sessions } = await adminSupabase
        .from('sessions')
        .select(`
            id,
            scheduled_at,
            status,
            zoom_meeting_status,
            duration_minutes,
            student_id,
            mentor_id,
            invoice_id,
            payout_amount_cents,
            student:profiles!sessions_student_id_fkey ( full_name ),
            mentor:profiles!sessions_mentor_id_fkey ( full_name )
        `)
        .or('status.eq.completed,zoom_meeting_status.eq.ended')
        .order('scheduled_at', { ascending: false })

    const mentorIds = [
        ...new Set((sessions || []).map((s: any) => s.mentor_id).filter(Boolean)),
    ] as string[]

    const rateByMentor = new Map<string, number>()
    if (mentorIds.length > 0) {
        const { data: mentors } = await adminSupabase
            .from('mentors')
            .select('id, hourly_rate_cents')
            .in('id', mentorIds)
        for (const m of mentors || []) {
            rateByMentor.set(
                m.id,
                m.hourly_rate_cents ?? DEFAULT_HOURLY_RATE_CENTS
            )
        }
    }

    const tableSessions = (sessions || []).map((s: any) => {
        const hourlyRateCents =
            rateByMentor.get(s.mentor_id) ?? DEFAULT_HOURLY_RATE_CENTS
        const durationMinutes = s.duration_minutes ?? 60
        const payoutOverrideCents = s.payout_amount_cents as number | null
        return {
            id: s.id as string,
            scheduledAt: s.scheduled_at as string | null,
            status: s.status as string,
            durationMinutes,
            studentName: (s.student?.full_name as string) || 'Unknown student',
            mentorName: (s.mentor?.full_name as string) || 'Unknown mentor',
            mentorId: s.mentor_id as string,
            invoiceId: (s.invoice_id as string | null) ?? null,
            payoutLocked: s.invoice_id != null,
            hourlyRateCents,
            payoutAmountCents: payoutOverrideCents,
            overrideActive: payoutOverrideCents != null,
            owedCents: sessionAmountCents(
                durationMinutes,
                hourlyRateCents,
                payoutOverrideCents
            ),
        }
    })

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Session Payouts
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Finished sessions only. Default payout is duration × mentor hourly rate.
                    Set a one-off flat amount when needed; sessions already on an invoice are locked.
                </p>
            </header>

            <SessionPayoutsTable sessions={tableSessions} />
        </div>
    )
}
