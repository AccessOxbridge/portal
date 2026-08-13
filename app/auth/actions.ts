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

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const origin = (await headers()).get('origin')
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const full_name = formData.get('full_name') as string
    // Public signup is disabled and all accounts are created by admin/dev. If
    // this action is ever reached, hard-force the least-privileged role so a
    // client-supplied role can never mint an admin/mentor account. (The DB-level
    // fix lands in Chunk 1 when handle_new_user() stops trusting client role.)
    const role = 'student'
    const member_code = formData.get('member_code') as string || null

    const data = {
        email,
        password,
        options: {
            data: {
                full_name,
                role,
                member_code,
            },
            emailRedirectTo: `${origin}/auth/callback`,
        },
    }

    const result = await supabase.auth.signUp(data)
    const { data: { user, session }, error } = result

    if (error) {
        console.error('Signup error:', error.message)
        redirect(`/error?message=${encodeURIComponent(error.message)}`)
    }

    // Check if user already exists but isn't confirmed or tries to re-signup
    // Supabase returns a user but empty identities if they already exist
    if (user && (!user.identities || user.identities.length === 0)) {
        console.log('User already exists, redirecting to login')
        redirect('/login?error=' + encodeURIComponent('An account with this email already exists. Please log in instead.'))
    }

    // If we have a session, the user is already logged in (direct signup)
    if (session) {
        console.log('Direct signup successful, redirecting to dashboard')
        revalidatePath('/', 'layout')
        redirect('/dashboard')
    }

    // If we have a user but no session, it means email verification is required
    if (user) {
        console.log('Signup successful, verification email sent. Redirecting to verify-email')
        redirect(`/verify-email?email=${encodeURIComponent(email)}`)
    }

    // This should theoretically not be reached if there's no error, but for robustness:
    console.warn('Signup returned no error but also no user/session')
    redirect('/dashboard')
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
