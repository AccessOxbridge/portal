import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyCreditGranter } from '@/lib/credit-granters'
import { notifyAdminsOfCreditAdjustment } from '@/lib/admin-credit-notify'
import { clientIp } from '@/lib/login-events'

export const runtime = 'nodejs'

const ADMIN_ROLES = ['admin', 'admin-dev']
const MAX_DELTA = 100
const MIN_REASON = 3
const MAX_REASON = 500

/**
 * Adjust a student's credit balance.
 *
 * Three gates, in order:
 *   1. Authenticated (401)
 *   2. profiles.role IN ('admin','admin-dev')       (403)
 *   3. uid present in ADMIN_CREDIT_GRANTERS         (403, or 503 if unconfigured)
 *
 * The write itself goes through public.admin_adjust_credits(), which is
 * SECURITY DEFINER and granted to service_role ONLY. That grant is what makes
 * gate 3 binding: an admin cannot skip it by calling the RPC from the browser,
 * because their session has no EXECUTE permission on it.
 */
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

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single()

        if (!profile || !ADMIN_ROLES.includes(profile.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const granter = verifyCreditGranter(user.id)
        if (!granter.ok) {
            return NextResponse.json({ error: granter.error }, { status: granter.status })
        }

        const body = await req.json().catch(() => null)
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
        const delta = body.delta
        const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

        if (!studentId) {
            return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
        }
        if (!Number.isInteger(delta) || delta === 0) {
            return NextResponse.json(
                { error: 'delta must be a non-zero whole number' },
                { status: 400 }
            )
        }
        if (Math.abs(delta) > MAX_DELTA) {
            return NextResponse.json(
                { error: `delta must be between -${MAX_DELTA} and ${MAX_DELTA}` },
                { status: 400 }
            )
        }
        if (reason.length < MIN_REASON || reason.length > MAX_REASON) {
            return NextResponse.json(
                { error: `reason must be ${MIN_REASON}-${MAX_REASON} characters` },
                { status: 400 }
            )
        }

        const admin = createAdminClient()

        const { data, error } = await admin.rpc('admin_adjust_credits', {
            p_admin_id: user.id,
            p_student_id: studentId,
            p_delta: delta,
            p_reason: reason,
            p_ip: clientIp(req.headers),
        })

        if (error) {
            console.error('[credits/adjust] rpc failed:', error)
            // The function raises 42501 for an authorisation failure, 22023 for
            // bad input and P0002 for an unknown student — those messages are
            // ours and safe to show. Anything else is an unexpected database
            // fault whose message could leak internals, so it stays in the log.
            const known: Record<string, number> = { '42501': 403, '22023': 400, P0002: 404 }
            const status = known[error.code as string]
            return status
                ? NextResponse.json({ error: error.message }, { status })
                : NextResponse.json({ error: 'Adjustment failed' }, { status: 500 })
        }

        const result = Array.isArray(data) ? data[0] : data
        if (!result) {
            console.error('[credits/adjust] rpc returned no rows')
            return NextResponse.json({ error: 'Adjustment failed' }, { status: 500 })
        }

        const balanceBefore = result.balance_before as number
        const balanceAfter = result.balance_after as number

        // The adjustment has committed. Everything below is best-effort and
        // must never turn a successful grant into an error the admin retries.
        const { data: student } = await admin
            .from('profiles')
            .select('full_name')
            .eq('id', studentId)
            .single()

        await notifyAdminsOfCreditAdjustment(admin, {
            adminId: user.id,
            adminName: profile.full_name,
            studentId,
            studentName: student?.full_name ?? null,
            delta: balanceAfter - balanceBefore,
            balanceBefore,
            balanceAfter,
            reason,
            transactionId: result.transaction_id as string,
        })

        return NextResponse.json({
            balanceBefore,
            balanceAfter,
            transactionId: result.transaction_id,
        })
    } catch (error: any) {
        console.error('[credits/adjust] error:', error)
        return NextResponse.json({ error: 'Adjustment failed' }, { status: 500 })
    }
}
