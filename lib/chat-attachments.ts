/**
 * Shared types and browser-side helpers for chat attachments.
 *
 * Design note on cost: Supabase's Image Transformation API is tempting here,
 * but the Pro plan only includes 100 origin images per month and then bills
 * $5 per 1,000. A chat would blow through that immediately. Instead we
 * downscale once in the browser before upload and store a single optimised
 * file, so serving costs nothing beyond ordinary egress.
 *
 * Uploads go straight from the browser to Storage, which also means they
 * never touch the 10MB server-action body limit in next.config.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { validatePhotoUpload, ALLOWED_PHOTO_TEXT } from '@/lib/image-upload'

export const CHAT_BUCKET = 'chat-attachments'

/** Longest edge, in pixels, that we keep for an uploaded photo. */
const MAX_IMAGE_EDGE = 1600

/** WebP quality for downscaled photos — visually clean, roughly 4-6x smaller. */
const WEBP_QUALITY = 0.82

/** Hard ceiling per file, matched by `file_size_limit` on the bucket. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/** Non-image types a user may attach. */
const ALLOWED_DOC_MIME = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

/** `accept` attribute for the composer's file input. */
export const ATTACHMENT_ACCEPT_ATTR = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ...ALLOWED_DOC_MIME,
].join(',')

export const MAX_ATTACHMENTS_PER_MESSAGE = 6

/** One entry in `messages.attachments`. */
export interface ChatAttachment {
    /** Object path inside the `chat-attachments` bucket. */
    path: string
    name: string
    mime: string
    size: number
    kind: 'image' | 'file'
    width?: number
    height?: number
}

/** A file chosen in the composer but not yet uploaded. */
export interface PendingAttachment {
    id: string
    file: File
    kind: 'image' | 'file'
    /** Object URL for the local preview; revoked when the item is removed. */
    previewUrl?: string
    width?: number
    height?: number
    error?: string
}

export function isImageMime(mime: string): boolean {
    return mime.startsWith('image/')
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Downscale an image to at most MAX_IMAGE_EDGE on its longest side and
 * re-encode as WebP.
 *
 * HEIC note: iPhones shoot HEIC by default and browsers cannot render it in
 * an <img>. Safari *can* decode it via the system codecs, so this conversion
 * quietly rescues the common case (photo sent from an iPhone). Where decode
 * fails we surface the existing HEIC guidance instead of storing a file that
 * would show as a broken image.
 */
export async function prepareImageForUpload(
    file: File
): Promise<{ ok: true; file: File; width: number; height: number } | { ok: false; error: string }> {
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return { ok: false, error: `Images must be under ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.` }
    }

    let bitmap: ImageBitmap
    try {
        bitmap = await createImageBitmap(file)
    } catch {
        // Decode failed. Fall back to byte-sniffing so the user gets the
        // specific HEIC instructions rather than a generic failure.
        const validation = await validatePhotoUpload(file, { maxBytes: MAX_ATTACHMENT_BYTES })
        return {
            ok: false,
            error: validation.ok
                ? `Could not read that image. Please try a ${ALLOWED_PHOTO_TEXT} file.`
                : validation.error,
        }
    }

    const { width: sourceWidth, height: sourceHeight } = bitmap
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight))
    const width = Math.round(sourceWidth * scale)
    const height = Math.round(sourceHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        bitmap.close()
        return { ok: false, error: 'Could not process that image. Please try again.' }
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    )
    if (!blob) {
        return { ok: false, error: 'Could not process that image. Please try again.' }
    }

    // Animated GIFs lose their animation through canvas. Keep the original
    // when re-encoding actually made things worse or the source was a GIF.
    if (file.type === 'image/gif' || blob.size >= file.size) {
        return { ok: true, file, width: sourceWidth, height: sourceHeight }
    }

    const renamed = file.name.replace(/\.[^.]+$/, '') || 'image'
    return {
        ok: true,
        file: new File([blob], `${renamed}.webp`, { type: 'image/webp' }),
        width,
        height,
    }
}

/** Validate a non-image attachment. */
export function validateDocument(file: File): { ok: true } | { ok: false; error: string } {
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return { ok: false, error: `Files must be under ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.` }
    }
    if (!ALLOWED_DOC_MIME.includes(file.type as (typeof ALLOWED_DOC_MIME)[number])) {
        return { ok: false, error: 'Only PDF and Word documents can be attached.' }
    }
    return { ok: true }
}

/**
 * Upload one prepared attachment and return its stored descriptor.
 * Path is `<conversation_id>/<message_id>/<filename>`, which is what the
 * bucket policy checks against.
 */
export async function uploadAttachment(
    supabase: SupabaseClient,
    {
        conversationId,
        messageId,
        file,
        kind,
        width,
        height,
    }: {
        conversationId: string
        messageId: string
        file: File
        kind: 'image' | 'file'
        width?: number
        height?: number
    }
): Promise<ChatAttachment> {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80) || 'attachment'
    const path = `${conversationId}/${messageId}/${crypto.randomUUID()}-${safeName}`

    const { error } = await supabase.storage
        .from(CHAT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw error

    return { path, name: file.name, mime: file.type, size: file.size, kind, width, height }
}

/**
 * Resolve storage paths to time-limited signed URLs. The bucket is private,
 * so nothing renders without this step.
 */
export async function signAttachmentUrls(
    supabase: SupabaseClient,
    paths: string[],
    expiresInSeconds = 60 * 60
): Promise<Map<string, string>> {
    const urls = new Map<string, string>()
    if (paths.length === 0) return urls

    const { data, error } = await supabase.storage
        .from(CHAT_BUCKET)
        .createSignedUrls(paths, expiresInSeconds)

    if (error || !data) return urls

    for (const entry of data) {
        if (entry.signedUrl && entry.path) urls.set(entry.path, entry.signedUrl)
    }
    return urls
}

/**
 * Narrow a raw `jsonb` value from the database into attachments.
 *
 * Postgres jsonb surfaces as the generated `Json` type, which is a union wide
 * enough to include strings and numbers. Rather than casting and hoping, we
 * check the shape — a malformed or hand-edited row degrades to "no
 * attachments" instead of crashing the thread.
 */
export function toChatAttachments(value: unknown): ChatAttachment[] | null {
    if (!Array.isArray(value)) return null

    const valid = value.filter(
        (entry): entry is ChatAttachment =>
            !!entry &&
            typeof entry === 'object' &&
            typeof (entry as ChatAttachment).path === 'string' &&
            typeof (entry as ChatAttachment).name === 'string'
    )

    return valid.length > 0 ? valid : null
}

/** Conversation-list preview text for a message that may carry attachments. */
export function attachmentPreviewLabel(raw: unknown): string | null {
    const attachments = toChatAttachments(raw)
    if (!attachments) return null

    const images = attachments.filter((a) => a.kind === 'image').length
    const files = attachments.length - images

    if (images > 0 && files === 0) return images === 1 ? '📷 Photo' : `📷 ${images} photos`
    if (files > 0 && images === 0) return files === 1 ? '📎 Attachment' : `📎 ${files} attachments`
    return `📎 ${attachments.length} attachments`
}
