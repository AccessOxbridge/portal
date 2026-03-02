import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { createTransfer } from '@/utils/stripe'

/**
 * Admin endpoints for managing mentor payouts
 * GET: Calculate pending payouts for a date range
 * POST: Process payouts for selected mentors
 */

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()

        // 1. Verify admin access
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

        // 2. Get date range from query params
        const { searchParams } = new URL(req.url)
        const periodStart = searchParams.get('start')
        const periodEnd = searchParams.get('end')

        if (!periodStart || !periodEnd) {
            return NextResponse.json({ error: 'start and end dates are required' }, { status: 400 })
        }

        // Interpret dates as full days: [start 00:00, end 24:00)
        const startDate = new Date(`${periodStart}T00:00:00.000Z`)
        const endDate = new Date(`${periodEnd}T00:00:00.000Z`)
        const endExclusive = new Date(endDate)
        endExclusive.setDate(endExclusive.getDate() + 1)

        // 3. Get all sessions in the date range (no inner join – we look up mentor data separately)
        const { data: sessions, error: sessionsError } = await adminSupabase
            .from('sessions')
            .select('id, mentor_id, scheduled_at, duration_minutes, status, zoom_meeting_status')
            .gte('scheduled_at', startDate.toISOString())
            .lt('scheduled_at', endExclusive.toISOString())

        if (sessionsError) throw sessionsError

        // Filter to finished sessions
        const finishedSessions = (sessions || []).filter(
            s => s.status === 'completed' || s.zoom_meeting_status === 'ended'
        )

        // Collect unique mentor IDs
        const mentorIds = [...new Set(finishedSessions.map(s => s.mentor_id))]

        // Batch-fetch mentor + profile data for those IDs
        const mentorMap: Record<string, {
            full_name: string
            email: string
            stripe_account_id: string | null
            payouts_enabled: boolean
            hourly_rate_cents: number
        }> = {}

        if (mentorIds.length > 0) {
            const { data: mentorRows } = await supabase
                .from('mentors')
                .select('id, hourly_rate_cents, stripe_account_id, payouts_enabled')
                .in('id', mentorIds)

            const { data: profileRows } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', mentorIds)

            const profileLookup: Record<string, any> = {}
            for (const p of profileRows || []) profileLookup[p.id] = p

            for (const m of mentorRows || []) {
                const p = profileLookup[m.id] || {}
                mentorMap[m.id] = {
                    full_name: p.full_name || 'Unknown',
                    email: p.email || '',
                    stripe_account_id: m.stripe_account_id || null,
                    payouts_enabled: !!m.payouts_enabled,
                    hourly_rate_cents: m.hourly_rate_cents || 2500,
                }
            }
        }

        // 4. Group sessions by mentor and calculate earnings
        const mentorEarnings: Record<string, {
            mentor_id: string
            mentor_name: string
            mentor_email: string
            stripe_account_id: string | null
            payouts_enabled: boolean
            hourly_rate_cents: number
            sessions: Array<{
                id: string
                scheduled_at: string
                duration_minutes: number
            }>
            total_minutes: number
            total_cents: number
        }> = {}

        for (const session of finishedSessions) {
            const mentorId = session.mentor_id
            const info = mentorMap[mentorId]

            if (!mentorEarnings[mentorId]) {
                mentorEarnings[mentorId] = {
                    mentor_id: mentorId,
                    mentor_name: info?.full_name || 'Unknown',
                    mentor_email: info?.email || '',
                    stripe_account_id: info?.stripe_account_id || null,
                    payouts_enabled: info?.payouts_enabled || false,
                    hourly_rate_cents: info?.hourly_rate_cents || 2500,
                    sessions: [],
                    total_minutes: 0,
                    total_cents: 0
                }
            }

            const durationMinutes = session.duration_minutes || 60
            const amountCents = Math.round((durationMinutes / 60) * mentorEarnings[mentorId].hourly_rate_cents)

            mentorEarnings[mentorId].sessions.push({
                id: session.id,
                scheduled_at: session.scheduled_at!,
                duration_minutes: durationMinutes
            })
            mentorEarnings[mentorId].total_minutes += durationMinutes
            mentorEarnings[mentorId].total_cents += amountCents
        }

        // 5. Check for existing payouts that overlap with the queried period
        const { data: existingPayouts } = await adminSupabase
            .from('mentor_payouts')
            .select('mentor_id, status')
            .lte('period_start', periodEnd)
            .gte('period_end', periodStart)

        const paidMentors = new Set(
            existingPayouts
                ?.filter(p => ['processing', 'paid'].includes(p.status))
                .map(p => p.mentor_id) || []
        )

        // Mark already paid mentors
        const result = Object.values(mentorEarnings).map(e => ({
            ...e,
            already_paid: paidMentors.has(e.mentor_id)
        }))

        return NextResponse.json({
            period_start: periodStart,
            period_end: periodEnd,
            mentors: result,
            total_amount_cents: result.reduce((sum, m) => sum + (m.already_paid ? 0 : m.total_cents), 0)
        })

    } catch (error: any) {
        console.error('Calculate Payouts Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to calculate payouts' },
            { status: 500 }
        )
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()

        // 1. Verify admin access
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

        // 2. Get request body
        const { mentor_ids, period_start, period_end } = await req.json()

        if (!mentor_ids?.length || !period_start || !period_end) {
            return NextResponse.json(
                { error: 'mentor_ids, period_start, and period_end are required' },
                { status: 400 }
            )
        }

        // Interpret dates as full days: [start 00:00, end 24:00)
        const startDatePost = new Date(`${period_start}T00:00:00.000Z`)
        const endDatePost = new Date(`${period_end}T00:00:00.000Z`)
        const endExclusivePost = new Date(endDatePost)
        endExclusivePost.setDate(endExclusivePost.getDate() + 1)

        const results: Array<{
            mentor_id: string
            success: boolean
            payout_id?: string
            transfer_id?: string
            error?: string
        }> = []

        // 3. Process each mentor
        for (const mentorId of mentor_ids) {
            try {
                // Get mentor's Stripe account and sessions
                const { data: mentor } = await adminSupabase
                    .from('mentors')
                    .select('stripe_account_id, payouts_enabled, hourly_rate_cents')
                    .eq('id', mentorId)
                    .single()

                if (!mentor?.stripe_account_id || !mentor.payouts_enabled) {
                    results.push({
                        mentor_id: mentorId,
                        success: false,
                        error: 'Stripe account not set up or payouts not enabled'
                    })
                    continue
                }

                // Get completed/ended sessions for this mentor in the period
                const { data: sessions } = await adminSupabase
                    .from('sessions')
                    .select('id, duration_minutes, status, zoom_meeting_status')
                    .eq('mentor_id', mentorId)
                    .gte('scheduled_at', startDatePost.toISOString())
                    .lt('scheduled_at', endExclusivePost.toISOString())

                const eligibleSessions = (sessions || []).filter(
                    s => s.status === 'completed' || s.zoom_meeting_status === 'ended'
                )

                if (!eligibleSessions.length) {
                    results.push({
                        mentor_id: mentorId,
                        success: false,
                        error: 'No completed/ended sessions in this period'
                    })
                    continue
                }

                // Calculate total
                const hourlyRateCents = mentor.hourly_rate_cents || 2500
                let totalMinutes = 0
                let totalCents = 0

                for (const session of eligibleSessions) {
                    const duration = session.duration_minutes || 60
                    totalMinutes += duration
                    totalCents += Math.round((duration / 60) * hourlyRateCents)
                }

                // Check for existing payout
                const { data: existingPayout } = await adminSupabase
                    .from('mentor_payouts')
                    .select('id, status')
                    .eq('mentor_id', mentorId)
                    .eq('period_start', period_start)
                    .eq('period_end', period_end)
                    .single()

                if (existingPayout && ['processing', 'paid'].includes(existingPayout.status)) {
                    results.push({
                        mentor_id: mentorId,
                        success: false,
                        error: 'Payout already processed for this period'
                    })
                    continue
                }

                // Create payout record
                const { data: payout, error: payoutError } = await adminSupabase
                    .from('mentor_payouts')
                    .upsert({
                        id: existingPayout?.id,
                        mentor_id: mentorId,
                        period_start,
                        period_end,
                        sessions_count: eligibleSessions.length,
                        total_minutes: totalMinutes,
                        amount_cents: totalCents,
                        currency: 'gbp',
                        status: 'pending'
                    })
                    .select()
                    .single()

                if (payoutError) throw payoutError

                // Create payout items
                for (const session of eligibleSessions) {
                    const duration = session.duration_minutes || 60
                    await adminSupabase
                        .from('mentor_payout_items')
                        .insert({
                            payout_id: payout.id,
                            session_id: session.id,
                            duration_minutes: duration,
                            hourly_rate_cents: hourlyRateCents,
                            amount_cents: Math.round((duration / 60) * hourlyRateCents)
                        })
                }

                // Create Stripe Transfer
                const transferId = await createTransfer(
                    mentor.stripe_account_id,
                    totalCents,
                    'gbp',
                    {
                        payout_id: payout.id,
                        mentor_id: mentorId,
                        period_start,
                        period_end
                    }
                )

                // Update payout with transfer ID
                await adminSupabase
                    .from('mentor_payouts')
                    .update({
                        stripe_transfer_id: transferId,
                        status: 'processing',
                        processed_at: new Date().toISOString()
                    })
                    .eq('id', payout.id)

                results.push({
                    mentor_id: mentorId,
                    success: true,
                    payout_id: payout.id,
                    transfer_id: transferId
                })

            } catch (error: any) {
                console.error(`Payout error for mentor ${mentorId}:`, error)
                results.push({
                    mentor_id: mentorId,
                    success: false,
                    error: error.message || 'Failed to process payout'
                })
            }
        }

        return NextResponse.json({
            success: results.every(r => r.success),
            results
        })

    } catch (error: any) {
        console.error('Process Payouts Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to process payouts' },
            { status: 500 }
        )
    }
}
