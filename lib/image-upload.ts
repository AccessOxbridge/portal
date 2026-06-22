/**
 * Shared validation for user-uploaded profile photos.
 *
 * The problem this guards against: browsers cannot render HEIC/HEIF images
 * (the format iPhones produce by default) inside an <img> tag, so a HEIC photo
 * uploads fine and serves with HTTP 200 but shows as a broken image everywhere
 * it's displayed. We reject anything that isn't a web-displayable raster format
 * *before* it reaches storage.
 *
 * We sniff the file's magic bytes rather than trusting the extension or the
 * browser-supplied MIME type, because iOS Safari frequently mislabels HEIC
 * uploads (e.g. as image/jpeg or with a .jpg name) when sharing.
 */

/** Formats a browser will reliably render in an <img> tag. */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

/** Human-friendly list for error messages. */
export const ALLOWED_PHOTO_TEXT = 'JPEG, PNG, WebP, or GIF'

/** `accept` attribute value for photo file inputs. */
export const PHOTO_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/gif'

/** Default max upload size for a profile photo. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

/**
 * Detect the real image type from the leading bytes. Returns a MIME string for
 * recognised formats, 'image/heic' for HEIF-family files (HEIC/HEIF), or null
 * when the bytes match no image format we know.
 */
function sniffImageType(bytes: Uint8Array): string | null {
    // JPEG: FF D8 FF
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'image/jpeg'
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    ) {
        return 'image/png'
    }
    // GIF: 'GIF8'
    if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
        return 'image/gif'
    }
    // ISO-BMFF container ('....ftyp....'): WebP, HEIC/HEIF and AVIF all use a
    // brand at offset 8. RIFF/WEBP is handled separately below.
    if (bytes.length >= 12) {
        const ascii = (start: number, end: number) =>
            String.fromCharCode(...bytes.subarray(start, end))

        // WebP: 'RIFF' .... 'WEBP'
        if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
            return 'image/webp'
        }

        if (ascii(4, 8) === 'ftyp') {
            const brand = ascii(8, 12)
            const heifBrands = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1', 'msf1', 'heif']
            if (heifBrands.includes(brand)) return 'image/heic'
            // AVIF ('avif'/'avis') and other ftyp-based formats fall through as
            // unknown — we only positively allow the four ALLOWED_MIME types.
        }
    }
    return null
}

export type ImageValidationResult =
    | { ok: true; mime: (typeof ALLOWED_MIME)[number] }
    | { ok: false; error: string }

/**
 * Validate a profile-photo upload. Checks size, then verifies the actual bytes
 * are a browser-renderable image. HEIC/HEIF is rejected with a message that
 * tells the user how to fix it (iPhones can export JPEG directly).
 */
export async function validatePhotoUpload(
    file: File,
    { maxBytes = MAX_PHOTO_BYTES }: { maxBytes?: number } = {}
): Promise<ImageValidationResult> {
    if (file.size > maxBytes) {
        return { ok: false, error: `Photo must be less than ${Math.round(maxBytes / (1024 * 1024))}MB.` }
    }

    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    const detected = sniffImageType(header)

    if (detected === 'image/heic') {
        return {
            ok: false,
            error:
                "That photo is in Apple's HEIC format, which browsers can't display. " +
                'On iPhone, set Settings → Camera → Formats to "Most Compatible", or export/share the photo as a JPEG, then upload again.',
        }
    }

    if (!detected || !ALLOWED_MIME.includes(detected as (typeof ALLOWED_MIME)[number])) {
        return { ok: false, error: `Unsupported image format. Please upload a ${ALLOWED_PHOTO_TEXT} image.` }
    }

    return { ok: true, mime: detected as (typeof ALLOWED_MIME)[number] }
}

/** The file extension we store for a validated image, derived from its real type. */
export function extForMime(mime: (typeof ALLOWED_MIME)[number]): string {
    switch (mime) {
        case 'image/jpeg':
            return 'jpg'
        case 'image/png':
            return 'png'
        case 'image/webp':
            return 'webp'
        case 'image/gif':
            return 'gif'
    }
}
