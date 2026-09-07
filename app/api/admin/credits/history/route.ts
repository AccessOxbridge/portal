import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

const ADMIN_ROLES = ['admin', 'admin-dev']
const LIMIT = 25

/**
 * A student's credit ledger, newest first.
 *
 * Read-only, so it is gated on the admin role alone — the ADMIN_CREDIT_GRANTERS
 * allowlist restricts who can MOVE credits, not who can look at the history.
 */
export async function GET(req: Request) {
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
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !ADMIN_ROLES.includes(profile.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const studentId = new URL(req.url).searchParams.get('studentId')?.trim()
        if (!studentId) {
            return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
        }

        const admin = createAdminClient()

        const { data: rows, error } = await admin
            .from('credit_transactions')
            .select('id, amount, balance_after, type, description, admin_id, created_at')
            .eq('user_id', studentId)
            .order('created_at', { ascending: false })
            .limit(LIMIT)

        if (error) {
            console.error('[credits/history] query failed:', error.message)
            return NextResponse.json({ error: 'Could not load history' }, { status: 500 })
        }

        const entries = rows || []

        // Resolve adjusting admins in one round trip rather than per row.
        const adminIds = Array.from(
            new Set(entries.map((r) => r.admin_id).filter((id): id is string => Boolean(id)))
        )

        let names: Record<string, string> = {}
        if (adminIds.length > 0) {
            const { data: admins } = await admin
                .from('profiles')
                .select('id, full_name')
                .in('id', adminIds)

            names = Object.fromEntries(
                (admins || []).map((a) => [a.id, a.full_name || 'Admin'])
            )
        }

        return NextResponse.json({
            entries: entries.map((r) => ({
                ...r,
                admin_name: r.admin_id ? names[r.admin_id] || 'Admin' : null,
            })),
        })
    } catch (error: any) {
        console.error('[credits/history] error:', error)
        return NextResponse.json({ error: 'Could not load history' }, { status: 500 })
    }
}
