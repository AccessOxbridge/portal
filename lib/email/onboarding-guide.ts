import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { EmailAttachment } from './client'

const GUIDE_FILES = {
    student: 'student_onboarding_guide.pdf',
    mentor: 'mentor_onboarding_guide.pdf',
} as const

export type OnboardingGuideKind = keyof typeof GUIDE_FILES

export const ONBOARDING_GUIDE_FILENAME = GUIDE_FILES.student
export const MENTOR_ONBOARDING_GUIDE_FILENAME = GUIDE_FILES.mentor

/**
 * Load an onboarding PDF as a Resend attachment.
 * Fail closed: missing or empty file is an error, not a silent skip.
 */
export async function loadOnboardingGuideAttachment(
    kind: OnboardingGuideKind
): Promise<{ ok: true; attachment: EmailAttachment } | { ok: false; error: string }> {
    const filename = GUIDE_FILES[kind]
    const guidePath = path.join(process.cwd(), 'lib/email/attachments', filename)

    try {
        const buf = await readFile(guidePath)
        if (buf.length === 0) {
            return { ok: false, error: 'Onboarding guide is empty' }
        }
        return {
            ok: true,
            attachment: {
                filename,
                content: buf.toString('base64'),
            },
        }
    } catch {
        return { ok: false, error: 'Onboarding guide is missing' }
    }
}
