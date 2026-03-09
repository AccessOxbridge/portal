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

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/1c3fc266-62c3-4a4c-91ae-b0327a1d8af1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': '103fb4'
            },
            body: JSON.stringify({
                sessionId: '103fb4',
                runId: 'pre-fix-1',
                hypothesisId: 'H1',
                location: 'app/api/admin/payouts/route.ts:52',
                message: 'Payouts GET – raw sessions fetched',
                data: {
                    periodStart,
                    periodEnd,
                    sessionsCount: (sessions || []).length,
                    mentorIds: Array.from(new Set((sessions || []).map(s => s.mentor_id)))
                },
                timestamp: Date.now()
            })
        }).catch(() => { })
        // #endregion agent log

        // Filter to finished sessions
        const finishedSessions = (sessions || []).filter(
            s => s.status === 'completed' || s.zoom_meeting_status === 'ended'
        )

        // 3b. Exclude sessions that have already been included in any payout batch
        const finishedSessionIds = finishedSessions.map(s => s.id)
        let unbatchedSessions = finishedSessions

        if (finishedSessionIds.length > 0) {
            const { data: existingItems } = await adminSupabase
                .from('mentor_payout_items')
                .select('session_id')
                .in('session_id', finishedSessionIds)

            const batchedSessionIds = new Set((existingItems || []).map(i => i.session_id))
            unbatchedSessions = finishedSessions.filter(s => !batchedSessionIds.has(s.id))

            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/1c3fc266-62c3-4a4c-91ae-b0327a1d8af1', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Debug-Session-Id': '103fb4'
                },
                body: JSON.stringify({
                    sessionId: '103fb4',
                    runId: 'post-fix-1',
                    hypothesisId: 'H4',
                    location: 'app/api/admin/payouts/route.ts:90',
                    message: 'Payouts GET – filter out already batched sessions',
                    data: {
                        periodStart,
                        periodEnd,
                        finishedCount: finishedSessions.length,
                        unbatchedCount: unbatchedSessions.length
                    },
                    timestamp: Date.now()
                })
            }).catch(() => { })
            // #endregion agent log
        }

        // Collect unique mentor IDs
        const mentorIds = [...new Set(unbatchedSessions.map(s => s.mentor_id))]

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

        for (const session of unbatchedSessions) {
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

        // 5. Check for existing payouts that match this exact period.
        // We only treat mentors as "already paid" when there is a payout
        // record for this *specific* period, to avoid incorrectly hiding
        // new sessions that fall within a broader date range.
        const { data: existingPayouts } = await adminSupabase
            .from('mentor_payouts')
            .select('mentor_id, status')
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd)

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/1c3fc266-62c3-4a4c-91ae-b0327a1d8af1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': '103fb4'
            },
            body: JSON.stringify({
                sessionId: '103fb4',
                runId: 'pre-fix-1',
                hypothesisId: 'H2',
                location: 'app/api/admin/payouts/route.ts:148',
                message: 'Payouts GET – existing payouts for period',
                data: {
                    periodStart,
                    periodEnd,
                    existing: (existingPayouts || []).map(p => ({
                        mentor_id: p.mentor_id,
                        status: p.status
                    }))
                },
                timestamp: Date.now()
            })
        }).catch(() => { })
        // #endregion agent log

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

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/1c3fc266-62c3-4a4c-91ae-b0327a1d8af1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': '103fb4'
            },
            body: JSON.stringify({
                sessionId: '103fb4',
                runId: 'pre-fix-1',
                hypothesisId: 'H3',
                location: 'app/api/admin/payouts/route.ts:161',
                message: 'Payouts GET – mentor earnings with already_paid flag',
                data: {
                    mentors: result.map(m => ({
                        mentor_id: m.mentor_id,
                        total_minutes: m.total_minutes,
                        total_cents: m.total_cents,
                        sessions_count: m.sessions.length,
                        already_paid: m.already_paid
                    }))
                },
                timestamp: Date.now()
            })
        }).catch(() => { })
        // #endregion agent log

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

                const finishedSessionsForMentor = (sessions || []).filter(
                    s => s.status === 'completed' || s.zoom_meeting_status === 'ended'
                )

                // Exclude sessions that are already part of any payout batch
                const mentorSessionIds = finishedSessionsForMentor.map(s => s.id)
                let eligibleSessions = finishedSessionsForMentor

                if (mentorSessionIds.length > 0) {
                    const { data: existingItems } = await adminSupabase
                        .from('mentor_payout_items')
                        .select('session_id')
                        .in('session_id', mentorSessionIds)

                    const batchedSessionIds = new Set((existingItems || []).map(i => i.session_id))
                    eligibleSessions = finishedSessionsForMentor.filter(s => !batchedSessionIds.has(s.id))

                    // #region agent log
                    fetch('http://127.0.0.1:7245/ingest/1c3fc266-62c3-4a4c-91ae-b0327a1d8af1', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Debug-Session-Id': '103fb4'
                        },
                        body: JSON.stringify({
                            sessionId: '103fb4',
                            runId: 'post-fix-1',
                            hypothesisId: 'H5',
                            location: 'app/api/admin/payouts/route.ts:334',
                            message: 'Payouts POST – eligible sessions after excluding batched ones',
                            data: {
                                mentorId,
                                finishedCount: finishedSessionsForMentor.length,
                                eligibleCount: eligibleSessions.length
                            },
                            timestamp: Date.now()
                        })
                    }).catch(() => { })
                    // #endregion agent log
                }

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

                // Create Stripe Transfer. Transfers are synchronous – if this call
                // succeeds, funds have been moved to the connected account, so we
                // can safely mark the payout as paid.
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

                // Update payout with transfer ID and mark as paid
                const nowIso = new Date().toISOString()
                await adminSupabase
                    .from('mentor_payouts')
                    .update({
                        stripe_transfer_id: transferId,
                        status: 'paid',
                        processed_at: nowIso,
                        paid_at: nowIso
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
