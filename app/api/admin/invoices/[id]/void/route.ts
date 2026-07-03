import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * POST /api/admin/invoices/[id]/void
 *
 * Admin (finance) voids a SUBMITTED invoice — e.g. it's wrong and the mentor
 * needs to reissue (spec §4.2: corrections are void + reissue). Paid invoices
 * can never be voided. Voiding releases the invoice's sessions back to the
 * mentor's unbilled pool and notifies the mentor in-app.
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

        const db = createAdminClient() as unknown as SupabaseClient

        const { data: invoice, error: fetchErr } = await db
            .from('mentor_invoices')
            .select('id, mentor_id, status, invoice_number, total_cents')
            .eq('id', id)
            .single()
        if (fetchErr || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }
        if (invoice.status !== 'submitted') {
            return NextResponse.json(
                { error: `Only submitted invoices can be voided (status: ${invoice.status})` },
                { status: 400 }
            )
        }

        // Void FIRST (conditional update = race guard against a concurrent
        // payment/void), only then release the sessions. The invoice number
        // stays burned; the row is kept for audit.
        const { data: voided, error: voidErr } = await db
            .from('mentor_invoices')
            .update({ status: 'void', voided_at: new Date().toISOString() })
            .eq('id', id)
            .eq('status', 'submitted')
            .select('id, status, voided_at')
            .maybeSingle()
        if (voidErr) throw voidErr
        if (!voided) {
            return NextResponse.json(
                { error: 'Invoice changed state (possibly just paid) — refresh and try again' },
                { status: 409 }
            )
        }

        // Release claimed sessions back to the mentor's unbilled pool.
        const { error: releaseErr } = await db
            .from('sessions')
            .update({ invoice_id: null })
            .eq('invoice_id', id)
        if (releaseErr) throw releaseErr

        // In-app notification to the mentor (recipient_email left empty so the
        // generic notifications trigger never emails). Best-effort.
        try {
            const label = invoice.invoice_number || 'your invoice'
            await db.from('notifications').insert({
                recipient_id: invoice.mentor_id,
                recipient_email: '',
                type: 'system_alert',
                title: 'Invoice voided by Finance',
                message: `Finance voided invoice ${label}. Its sessions are back in your unbilled list — you can create a new invoice for them.`,
                data: { invoice_id: id, invoice_number: invoice.invoice_number, kind: 'invoice_voided' },
            })
        } catch (notifyErr) {
            console.error('[admin:invoices:void] mentor notification failed:', notifyErr)
        }

        return NextResponse.json({ success: true, invoice: voided })
    } catch (error: any) {
        console.error('[admin:invoices:void]', error)
        return NextResponse.json(
            { error: error.message || 'Failed to void invoice' },
            { status: 500 }
        )
    }
}
