'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

type ActionResult = { ok: boolean; message: string }

/**
 * Update the signed-in user's timezone.
 * Students store it on `student_profiles`, mentors on `mentors`.
 */
export async function updateTimezone(timezone: string): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false, message: 'You must be signed in to update your timezone.' }
    }

    const tz = (timezone || '').trim()
    if (!tz) {
        return { ok: false, message: 'Please enter a timezone.' }
    }

    // Validate it's a real IANA timezone before saving.
    try {
        new Intl.DateTimeFormat('en-GB', { timeZone: tz })
    } catch {
        return { ok: false, message: 'That is not a valid IANA timezone (e.g. Europe/London).' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role
    const isStudent = role === 'student' || role === 'admin-dev'

    if (isStudent) {
        const { error } = await supabase
            .from('student_profiles')
            .upsert({ id: user.id, timezone: tz, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        if (error) {
            console.error('updateTimezone (student) error:', error.message)
            return { ok: false, message: 'Could not save your timezone. Please try again.' }
        }
    } else {
        const { error } = await supabase
            .from('mentors')
            .update({ timezone: tz, updated_at: new Date().toISOString() })
            .eq('id', user.id)
        if (error) {
            console.error('updateTimezone (mentor) error:', error.message)
            return { ok: false, message: 'Could not save your timezone. Please try again.' }
        }
    }

    revalidatePath('/dashboard/settings')
    return { ok: true, message: 'Timezone updated.' }
}

/**
 * Email the signed-in user a password reset link. The link lands on
 * /auth/callback which establishes a recovery session and forwards to
 * /reset-password where they set a new password.
 */
export async function sendPasswordResetLink(): Promise<ActionResult> {
    const supabase = await createClient()
    const origin = (await headers()).get('origin')

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
        return { ok: false, message: 'Could not determine your email address.' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
        console.error('sendPasswordResetLink error:', error.message)
        return { ok: false, message: 'Could not send the reset link. Please try again shortly.' }
    }

    return { ok: true, message: `We've emailed a password reset link to ${user.email}.` }
}
