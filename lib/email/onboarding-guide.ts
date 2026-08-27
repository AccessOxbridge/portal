import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { EmailAttachment } from './client'

export const ONBOARDING_GUIDE_FILENAME = 'student_onboarding_guide.pdf'

const GUIDE_PATH = path.join(
    process.cwd(),
    'lib/email/attachments',
    ONBOARDING_GUIDE_FILENAME
)

/**
 * Load the student onboarding PDF as a Resend attachment.
 * Fail closed: missing or empty file is an error, not a silent skip.
 */
export async function loadOnboardingGuideAttachment(): Promise<
    { ok: true; attachment: EmailAttachment } | { ok: false; error: string }
> {
    try {
        const buf = await readFile(GUIDE_PATH)
        if (buf.length === 0) {
            return { ok: false, error: 'Onboarding guide is empty' }
        }
        return {
            ok: true,
            attachment: {
                filename: ONBOARDING_GUIDE_FILENAME,
                content: buf.toString('base64'),
            },
        }
    } catch {
        return { ok: false, error: 'Onboarding guide is missing' }
    }
}
