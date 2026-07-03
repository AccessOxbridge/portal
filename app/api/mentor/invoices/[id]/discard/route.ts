import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * POST /api/mentor/invoices/[id]/discard
 *
 * Void an invoice the mentor still controls:
 *   - DRAFT: abandoned draft (spec §5 note / §11).
 *   - SUBMITTED: not yet paid — corrections are void + reissue (spec §4.2).
 * Paid invoices can never be voided. Voiding RELEASES the claimed sessions
 * back to the unbilled pool so they can be re-invoiced:
 *   UPDATE sessions SET invoice_id = NULL WHERE invoice_id = :id
 */
export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        if (!id) {
            return NextResponse.json({ error: 'Invoice id required' }, { status: 400 })
        }

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

        const db = createAdminClient() as unknown as SupabaseClient

        // Fetch the invoice and confirm ownership + voidable status.
        const { data: invoice, error: fetchErr } = await db
            .from('mentor_invoices')
            .select('id, mentor_id, status')
            .eq('id', id)
            .single()
        if (fetchErr || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }
        if (invoice.mentor_id !== user.id) {
            return NextResponse.json({ error: 'Not your invoice' }, { status: 403 })
        }
        if (invoice.status !== 'draft' && invoice.status !== 'submitted') {
            return NextResponse.json(
                { error: `Only draft or submitted invoices can be voided (status: ${invoice.status})` },
                { status: 400 }
            )
        }

        // Void FIRST (conditional update = race guard against a concurrent
        // payment/void), only then release the sessions. Kept for audit rather
        // than hard-deleted; a submitted invoice's number stays burned.
        const { data: voided, error: voidErr } = await db
            .from('mentor_invoices')
            .update({ status: 'void', voided_at: new Date().toISOString() })
            .eq('id', id)
            .in('status', ['draft', 'submitted'])
            .select('id, status, voided_at')
            .maybeSingle()
        if (voidErr) throw voidErr
        if (!voided) {
            return NextResponse.json(
                { error: 'Invoice changed state (possibly just paid) — refresh and try again' },
                { status: 409 }
            )
        }

        // Release claimed sessions back to the unbilled pool.
        const { error: releaseErr } = await db
            .from('sessions')
            .update({ invoice_id: null })
            .eq('invoice_id', id)
        if (releaseErr) throw releaseErr

        return NextResponse.json({ success: true, invoice: voided })
    } catch (error: any) {
        console.error('[invoices:discard]', error)
        return NextResponse.json(
            { error: error.message || 'Failed to discard invoice' },
            { status: 500 }
        )
    }
}
