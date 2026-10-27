import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireParentApi } from '@/lib/parent-api'
import { DOCUMENT_TYPES, DOCUMENTS_BUCKET, MAX_DOCUMENT_BYTES, MAX_DOCUMENTS, safeFileName } from '@/lib/parent-student-info'

/**
 * Parent document uploads, in two steps so files go straight to storage and
 * never through this function (Vercel caps request bodies at 4.5 MB):
 *
 *   POST { step: 'start', fileName, mimeType, size }
 *     -> a one-off signed upload URL for a fresh path under <parent_id>/
 *   POST { step: 'finish', path, fileName }
 *     -> checks the object exists under the caller's folder, reads its real
 *        size and type from storage, and records it in parent_documents.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireParentApi()
        if ('response' in auth) return auth.response
        const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
        const admin = createAdminClient()

        if (body?.step === 'start') {
            const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : ''
            const mimeType = typeof body.mimeType === 'string' ? body.mimeType : ''
            const size = typeof body.size === 'number' ? body.size : 0
            if (!fileName) return NextResponse.json({ error: 'The file has no name' }, { status: 400 })
            if (!DOCUMENT_TYPES[mimeType]) return NextResponse.json({ error: 'Please upload a PDF, Word document or image' }, { status: 400 })
            if (size <= 0 || size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: 'Files can be up to 10 MB' }, { status: 400 })

            const { count } = await admin.from('parent_documents').select('id', { count: 'exact', head: true }).eq('parent_id', auth.userId)
            if ((count ?? 0) >= MAX_DOCUMENTS) {
                return NextResponse.json({ error: `You can upload up to ${MAX_DOCUMENTS} documents` }, { status: 400 })
            }

            const path = `${auth.userId}/${randomUUID()}/${safeFileName(fileName)}`
            const { data, error } = await admin.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path)
            if (error || !data) {
                console.error('[parent/documents] signed upload URL failed:', error)
                return NextResponse.json({ error: 'Could not start the upload' }, { status: 500 })
            }
            return NextResponse.json({ path: data.path, token: data.token })
        }

        if (body?.step === 'finish') {
            const path = typeof body.path === 'string' ? body.path : ''
            const fileName = (typeof body.fileName === 'string' ? body.fileName.trim() : '').slice(0, 200) || 'Document'
            // Only ever a path this parent was given: <their id>/<uuid>/<name>.
            const parts = path.split('/')
            if (parts.length !== 3 || parts[0] !== auth.userId || parts.some((p) => !p || p === '..')) {
                return NextResponse.json({ error: 'Invalid upload' }, { status: 400 })
            }

            const { data: info, error: infoError } = await admin.storage.from(DOCUMENTS_BUCKET).info(path)
            if (infoError || !info) return NextResponse.json({ error: 'The upload did not finish' }, { status: 400 })
            const size = Number(info.size ?? 0)
            const mimeType = info.contentType || ''
            if (!DOCUMENT_TYPES[mimeType] || size <= 0 || size > MAX_DOCUMENT_BYTES) {
                await admin.storage.from(DOCUMENTS_BUCKET).remove([path])
                return NextResponse.json({ error: 'Please upload a PDF, Word document or image up to 10 MB' }, { status: 400 })
            }

            const { data: doc, error } = await admin
                .from('parent_documents')
                .insert({ parent_id: auth.userId, storage_path: path, file_name: fileName, mime_type: mimeType, size_bytes: size })
                .select('id, file_name, mime_type, size_bytes, created_at')
                .single()
            if (error || !doc) {
                console.error('[parent/documents] insert failed:', error)
                await admin.storage.from(DOCUMENTS_BUCKET).remove([path])
                return NextResponse.json({ error: 'Could not save the document' }, { status: 500 })
            }
            return NextResponse.json({
                document: { id: doc.id, fileName: doc.file_name, mimeType: doc.mime_type, sizeBytes: doc.size_bytes, createdAt: doc.created_at },
            })
        }

        return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
    } catch (e) {
        console.error('[parent/documents]', e)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
