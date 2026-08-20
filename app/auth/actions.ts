'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { recordLoginEvent } from '@/lib/login-events'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const result = await supabase.auth.signInWithPassword(data)
    const { error } = result

    // Recorded before the redirect below: `redirect()` works by throwing, so
    // anything after it in this branch would never run.
    await recordLoginEvent(data.email, error ? 'failed' : 'success')

    if (error) {
        console.error('Login error:', error.message)
        redirect(`/error?message=${encodeURIComponent(error.message)}&from=/login`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(_formData: FormData) {
    // Public student/generic signup stays closed. Mentor self-serve lives at
    // /become-a-mentor and never goes through this action. If this is reached
    // (dead SignupForm, old bookmark, bot POST), do not create an account.
    redirect('/login')
}

export async function resendEmail(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    if (!email) {
        redirect('/error?message=Email is required to resend verification link.')
    }

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
    })

    if (error) {
        console.error('Resend error:', error.message)
        redirect(`/error?message=${encodeURIComponent(error.message)}`)
    }

    redirect(`/verify-email?email=${encodeURIComponent(email)}&status=resent`)
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const origin = (await headers()).get('origin')
    const email = formData.get('email') as string

    if (!email) {
        redirect('/error?message=Email is required to reset password.')
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
        console.error('Forgot password error:', error.message)
        redirect(`/error?message=${encodeURIComponent(error.message)}`)
    }

    // Redirect to a success page or back to login with success message
    redirect(`/forgot-password?status=sent`)
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    // Keep validation feedback on the reset-password page so the user can retry
    // with the form (and their recovery session) still intact.
    if (!password || !confirmPassword) {
        redirect(`/reset-password?message=${encodeURIComponent('Both password fields are required.')}`)
    }

    if (password.length < 6) {
        redirect(`/reset-password?message=${encodeURIComponent('Password must be at least 6 characters.')}`)
    }

    if (password !== confirmPassword) {
        redirect(`/reset-password?message=${encodeURIComponent('Passwords do not match.')}`)
    }

    // The user must have an active (recovery) session to update their password.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/reset-password?error=session_missing&error_description=${encodeURIComponent('Your reset link has expired. Please request a new one.')}`)
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        console.error('Reset password error:', error.message)
        redirect(`/reset-password?message=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
