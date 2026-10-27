import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireParentApi } from '@/lib/parent-api'
import { DOCUMENTS_BUCKET } from '@/lib/parent-student-info'

/** Seconds a document link stays valid: enough to open it, too short to share. */
const LINK_SECONDS = 60

/**
 * GET /api/parent/documents/:id
 * Opens one document through a short-lived signed URL. The row is read with
 * the caller's own client, so RLS decides: the parent who uploaded it, or an
 * admin. Anyone else gets a 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: doc } = await supabase.from('parent_documents').select('storage_path, file_name').eq('id', id).maybeSingle()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await createAdminClient().storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.storage_path, LINK_SECONDS)
    if (error || !data) return NextResponse.json({ error: 'Could not open the document' }, { status: 500 })
    return NextResponse.redirect(data.signedUrl)
}

/**
 * DELETE /api/parent/documents/:id
 * A parent removes one of their own documents: the file and its record.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireParentApi()
    if ('response' in auth) return auth.response
    const { id } = await params

    const admin = createAdminClient()
    const { data: doc } = await admin.from('parent_documents').select('storage_path').eq('id', id).eq('parent_id', auth.userId).maybeSingle()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error: removeError } = await admin.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path])
    if (removeError) {
        console.error('[parent/documents] remove failed:', removeError)
        return NextResponse.json({ error: 'Could not remove the document' }, { status: 500 })
    }
    await admin.from('parent_documents').delete().eq('id', id).eq('parent_id', auth.userId)
    return NextResponse.json({ success: true })
}
