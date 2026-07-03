import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { renderInvoicePdf } from '@/utils/invoice-pdf'

// PDF rendering needs the Node runtime (@react-pdf/renderer is not Edge-safe).
export const runtime = 'nodejs'

/**
 * GET /api/mentor/invoices/[id]/pdf?variant=invoice|remittance
 *
 * Returns a short-lived signed URL to the invoice (or remittance) PDF in the
 * private `invoices` bucket. Access is restricted to the owning mentor or an
 * admin. If an `invoice` PDF hasn't been rendered yet (e.g. draft preview), it
 * is generated on demand; a `remittance` must already exist (created post-payout).
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        if (!id) {
            return NextResponse.json({ error: 'Invoice id required' }, { status: 400 })
        }

        const variantParam = new URL(req.url).searchParams.get('variant')
        const variant: 'invoice' | 'remittance' = variantParam === 'remittance' ? 'remittance' : 'invoice'

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
        const isAdmin = !!profile && ['admin', 'admin-dev'].includes(profile.role)

        const db = createAdminClient() as unknown as SupabaseClient

        // Ownership check.
        const { data: invoice, error: invErr } = await db
            .from('mentor_invoices')
            .select('id, mentor_id')
            .eq('id', id)
            .single()
        if (invErr || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }
        if (!isAdmin && invoice.mentor_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Find the latest stored document of this kind.
        const { data: doc } = await db
            .from('mentor_invoice_documents')
            .select('pdf_path')
            .eq('invoice_id', id)
            .eq('kind', variant)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        let path = doc?.pdf_path as string | undefined

        // Render on demand for invoice previews; remittances must already exist.
        if (!path) {
            if (variant === 'remittance') {
                return NextResponse.json({ error: 'Remittance not available yet' }, { status: 404 })
            }
            path = await renderInvoicePdf(id, 'invoice')
        }

        const { data: signed, error: signErr } = await db.storage
            .from('invoices')
            .createSignedUrl(path, 600) // 10 minutes
        if (signErr || !signed) throw signErr || new Error('Failed to sign URL')

        return NextResponse.json({ url: signed.signedUrl, path, variant })
    } catch (error: any) {
        console.error('[invoices:pdf]', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate invoice PDF' },
            { status: 500 }
        )
    }
}
