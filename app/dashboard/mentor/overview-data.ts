import type { SupabaseClient } from '@supabase/supabase-js'
import { getZonedNow, zonedTimeToUtcISO } from '@/lib/timezone'

/**
 * Everything the mentor home shows, for one mentor, from real rows. Read-only.
 *
 * The live page passes the mentor's own signed-in client, so row-level
 * security limits it to their sessions, requests and payouts. Only
 * completed sessions count as done (they are the ones that are paid). Months
 * run by the calendar in the mentor's timezone (UK if unset).
 *
 * Ratings are deliberately left out: they stay admin-only.
 */

const HOUR = 60 * 60 * 1000

export interface MentorOverview {
    firstName: string
    timezone: string
    next: { id: string; at: string; student: string; studentPhoto: string | null; canStart: boolean }[]
    requestsPending: number
    oldestRequestAt: string | null
    reportsToWrite: number
    month: { completed: number; minutes: number; earningsCents: number }
    readyToInvoice: { sessions: number; cents: number }
    lastPayout: { amountCents: number; paidAt: string } | null
    students: { id: string; name: string; photo: string | null; lastAt: string | null; nextAt: string | null }[]
    onboardingIncomplete: boolean
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

export async function loadMentorOverview(db: SupabaseClient, mentorId: string): Promise<MentorOverview> {
    const now = new Date()
    const nowIso = now.toISOString()
    const startedRecently = new Date(now.getTime() - 90 * 60 * 1000).toISOString()

    const [{ data: profile }, { data: mentor }] = await Promise.all([
        db.from('profiles').select('full_name').eq('id', mentorId).single(),
        db.from('mentors')
            .select('hourly_rate_cents, timezone, questionnaire_completed_at, contract_signed_at, dbs_certificate_url, background_check_confirmed_at, payouts_enabled, profile_completed_at, bio, photo_url')
            .eq('id', mentorId)
            .single(),
    ])

    const timezone = mentor?.timezone || 'Europe/London'
    const today = getZonedNow(timezone).date
    const monthStart = zonedTimeToUtcISO(`${today.slice(0, 7)}-01`, '00:00', timezone)
    const rate = mentor?.hourly_rate_cents ?? 0
    const payoutOf = (s: { payout_amount_cents: number | null; duration_minutes: number | null }) =>
        s.payout_amount_cents ?? Math.round((rate * (s.duration_minutes ?? 60)) / 60)

    const [upcoming, requests, completed, assignments, payouts] = await Promise.all([
        db.from('sessions')
            .select('id, scheduled_at, zoom_meeting_id, zoom_start_url, student_id, student:profiles!sessions_student_id_fkey(full_name, photo_url)')
            .eq('mentor_id', mentorId)
            .eq('status', 'active')
            .gte('scheduled_at', startedRecently)
            .order('scheduled_at', { ascending: true })
            .limit(50),
        db.from('mentorship_requests').select('created_at').eq('mentor_id', mentorId).eq('status', 'pending').order('created_at', { ascending: true }),
        db.from('sessions')
            .select('id, scheduled_at, student_id, duration_minutes, payout_amount_cents, invoice_id')
            .eq('mentor_id', mentorId)
            .eq('status', 'completed')
            .order('scheduled_at', { ascending: false }),
        db.from('student_mentor_assignments')
            .select('student_id, student:profiles!student_mentor_assignments_student_id_fkey(full_name, photo_url)')
            .eq('mentor_id', mentorId)
            .eq('is_current', true),
        db.from('mentor_payouts').select('amount_cents, paid_at').eq('mentor_id', mentorId).eq('status', 'paid').order('paid_at', { ascending: false }).limit(1),
    ])

    const completedRows = completed.data ?? []
    let reportsToWrite = 0
    if (completedRows.length > 0) {
        const { data: reports } = await db
            .from('form_responses')
            .select('session_id')
            .eq('respondent_id', mentorId)
            .eq('form_type', 'mentor_report')
            .in('session_id', completedRows.map((s) => s.id))
        const done = new Set((reports ?? []).map((r) => r.session_id))
        reportsToWrite = completedRows.filter((s) => !done.has(s.id)).length
    }

    const thisMonth = completedRows.filter((s) => s.scheduled_at && s.scheduled_at >= monthStart && s.scheduled_at <= nowIso)
    const unbilled = completedRows.filter((s) => !s.invoice_id)
    const upcomingRows = upcoming.data ?? []

    const students = (assignments.data ?? []).map((a) => {
        const student = one(a.student as { full_name: string | null; photo_url: string | null } | { full_name: string | null; photo_url: string | null }[] | null)
        return {
            id: a.student_id as string,
            name: student?.full_name || 'Student',
            photo: student?.photo_url ?? null,
            lastAt: completedRows.find((s) => s.student_id === a.student_id)?.scheduled_at ?? null,
            nextAt: upcomingRows.find((s) => s.student_id === a.student_id && s.scheduled_at && s.scheduled_at >= nowIso)?.scheduled_at ?? null,
        }
    })

    const payout = payouts.data?.[0]
    const m = mentor
    const onboardingIncomplete = !!m && !(
        m.questionnaire_completed_at &&
        m.contract_signed_at &&
        (m.dbs_certificate_url || m.background_check_confirmed_at) &&
        m.payouts_enabled &&
        (m.profile_completed_at || (m.bio && m.photo_url))
    )

    return {
        firstName: (profile?.full_name || 'there').trim().split(/\s+/)[0],
        timezone,
        next: upcomingRows
            .filter((s) => s.scheduled_at && new Date(s.scheduled_at).getTime() > now.getTime() - HOUR)
            .slice(0, 4)
            .map((s) => {
                const student = one(s.student as { full_name: string | null; photo_url: string | null } | { full_name: string | null; photo_url: string | null }[] | null)
                return {
                    id: s.id,
                    at: s.scheduled_at as string,
                    student: student?.full_name || 'Student',
                    studentPhoto: student?.photo_url ?? null,
                    canStart: !!(s.zoom_meeting_id || s.zoom_start_url),
                }
            }),
        requestsPending: requests.data?.length ?? 0,
        oldestRequestAt: requests.data?.[0]?.created_at ?? null,
        reportsToWrite,
        month: {
            completed: thisMonth.length,
            minutes: thisMonth.reduce((sum, s) => sum + (s.duration_minutes ?? 60), 0),
            earningsCents: thisMonth.reduce((sum, s) => sum + payoutOf(s), 0),
        },
        readyToInvoice: { sessions: unbilled.length, cents: unbilled.reduce((sum, s) => sum + payoutOf(s), 0) },
        lastPayout: payout?.paid_at ? { amountCents: payout.amount_cents ?? 0, paidAt: payout.paid_at } : null,
        students,
        onboardingIncomplete,
    }
}
