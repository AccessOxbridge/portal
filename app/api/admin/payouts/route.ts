import { createClient } from '@/utils/supabase/server'
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

        // 3. Get completed sessions with mentor info
        const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select(`
                id,
                mentor_id,
                scheduled_at,
                duration_minutes,
                status,
                zoom_meeting_status,
                profiles!sessions_mentor_id_fkey!inner (
                    full_name,
                    email,
                    mentors!inner (
                        id,
                        hourly_rate_cents,
                        stripe_account_id,
                        payouts_enabled
                    )
                )
            `)
            .eq('status', 'completed')
            .gte('scheduled_at', periodStart)
            .lte('scheduled_at', periodEnd)

        if (sessionsError) throw sessionsError

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

        for (const session of sessions || []) {
            const mentorId = session.mentor_id
            const profile = session.profiles as any
            const mentor = profile?.mentors

            if (!mentorEarnings[mentorId]) {
                mentorEarnings[mentorId] = {
                    mentor_id: mentorId,
                    mentor_name: profile?.full_name || 'Unknown',
                    mentor_email: profile?.email || '',
                    stripe_account_id: mentor?.stripe_account_id || null,
                    payouts_enabled: mentor?.payouts_enabled || false,
                    hourly_rate_cents: mentor?.hourly_rate_cents || 2500,
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

        // 5. Check for existing payouts in this period
        const { data: existingPayouts } = await supabase
            .from('mentor_payouts')
            .select('mentor_id, status')
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd)

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
                const { data: mentor } = await supabase
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

                // Get completed sessions for this mentor in the period
                const { data: sessions } = await supabase
                    .from('sessions')
                    .select('id, duration_minutes')
                    .eq('mentor_id', mentorId)
                    .eq('status', 'completed')
                    .gte('scheduled_at', period_start)
                    .lte('scheduled_at', period_end)

                if (!sessions?.length) {
                    results.push({
                        mentor_id: mentorId,
                        success: false,
                        error: 'No completed sessions in this period'
                    })
                    continue
                }

                // Calculate total
                const hourlyRateCents = mentor.hourly_rate_cents || 2500
                let totalMinutes = 0
                let totalCents = 0

                for (const session of sessions) {
                    const duration = session.duration_minutes || 60
                    totalMinutes += duration
                    totalCents += Math.round((duration / 60) * hourlyRateCents)
                }

                // Check for existing payout
                const { data: existingPayout } = await supabase
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
                const { data: payout, error: payoutError } = await supabase
                    .from('mentor_payouts')
                    .upsert({
                        id: existingPayout?.id,
                        mentor_id: mentorId,
                        period_start,
                        period_end,
                        sessions_count: sessions.length,
                        total_minutes: totalMinutes,
                        amount_cents: totalCents,
                        currency: 'gbp',
                        status: 'pending'
                    })
                    .select()
                    .single()

                if (payoutError) throw payoutError

                // Create payout items
                for (const session of sessions) {
                    const duration = session.duration_minutes || 60
                    await supabase
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
                await supabase
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
