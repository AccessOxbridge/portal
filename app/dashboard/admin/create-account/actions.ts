'use server'

import { revalidatePath } from 'next/cache'
import { EMAIL_SENDER_TEAM, sendEmail } from '@/lib/email/client'
import { loadOnboardingGuideAttachment } from '@/lib/email/onboarding-guide'
import { studentWelcome } from '@/lib/email/templates'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

const STUDENT_ROLE = 'student' as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_HOURS = 1000

function isStrongPassword(password: string): boolean {
    return (
        password.length >= 12 &&
        password.length <= 128 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        !/\s/.test(password)
    )
}

export async function createStudentAccount(formData: FormData): Promise<
    { error: string } | { success: true; emailSent: boolean; warning?: string }
> {
    const authClient = await createClient()
    const {
        data: { user },
    } = await authClient.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { data: callerProfile } = await authClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'admin-dev')) {
        return { error: 'Not authorized' }
    }

    const fullName = String(formData.get('full_name') || '').trim()
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '')
    const hoursRaw = String(formData.get('total_hours') ?? '').trim()

    if (!fullName || fullName.length < 2 || fullName.length > 100) {
        return { error: 'Full name must be between 2 and 100 characters' }
    }
    if (!email || !EMAIL_RE.test(email)) {
        return { error: 'A valid email is required' }
    }
    if (!isStrongPassword(password)) {
        return { error: 'Password must be at least 12 characters with uppercase, lowercase, and a number' }
    }
    if (!/^\d+$/.test(hoursRaw)) {
        return { error: 'Total hours must be a whole number' }
    }
    const hours = Number.parseInt(hoursRaw, 10)
    if (hours < 0 || hours > MAX_HOURS) {
        return { error: `Total hours must be between 0 and ${MAX_HOURS}` }
    }

    const guide = await loadOnboardingGuideAttachment()
    if (!guide.ok) {
        return { error: guide.error }
    }

    const admin = createAdminClient()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
        },
        app_metadata: {
            role: STUDENT_ROLE,
        },
    })

    if (createError || !created.user) {
        const message = (createError?.message || '').toLowerCase()
        if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
            return { error: 'An account with this email already exists' }
        }
        console.error('createStudentAccount createUser failed:', createError?.message)
        return { error: 'Failed to create the student account' }
    }

    const userId = created.user.id

    const loadProfile = async () =>
        admin.from('profiles').select('id, role, credits').eq('id', userId).single()

    let { data: profile } = await loadProfile()
    if (!profile) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        ;({ data: profile } = await loadProfile())
    }

    if (!profile || profile.role !== STUDENT_ROLE) {
        console.error('createStudentAccount refused: profile role was not student', {
            userId,
            role: profile?.role ?? null,
        })
        await admin.auth.admin.deleteUser(userId)
        return { error: 'Failed to create the student account' }
    }

    let hoursWarning: string | undefined
    if (hours > 0) {
        const { error: creditsError } = await admin
            .from('profiles')
            .update({ credits: hours })
            .eq('id', userId)

        if (creditsError) {
            console.error('createStudentAccount credits update failed:', creditsError.message)
            hoursWarning =
                'Account was created but hours could not be applied. Please adjust hours from Transactions or contact engineering.'
        } else {
            const { error: txError } = await admin.from('credit_transactions').insert({
                user_id: userId,
                amount: hours,
                balance_after: hours,
                type: 'admin_adjustment',
                description: 'Initial hours on account creation',
            })

            if (txError) {
                console.error('createStudentAccount credit_transactions insert failed:', txError.message)
            }
        }
    }

    const template = studentWelcome({
        fullName,
        email,
        password,
    })

    const sendResult = await sendEmail({
        from: EMAIL_SENDER_TEAM,
        to: email,
        subject: template.subject,
        html: template.html,
        attachments: [guide.attachment],
    })

    if (!sendResult.ok) {
        console.error('createStudentAccount welcome email failed:', sendResult.error)
    }

    revalidatePath('/dashboard/admin/create-account')
    return {
        success: true,
        emailSent: sendResult.ok,
        warning: hoursWarning,
    }
}
