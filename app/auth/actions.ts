'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    console.log('Login attempt for:', data.email)

    const result = await supabase.auth.signInWithPassword(data)
    const { error } = result

    console.log('Login result:', JSON.stringify(result, null, 2))

    if (error) {
        console.error('Login error:', error.message)
        redirect(`/error?message=${encodeURIComponent(error.message)}`)
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
    const role = formData.get('role') as string

    const data = {
        email,
        password,
        options: {
            data: {
                full_name,
                role,
            },
            emailRedirectTo: `${origin}/auth/callback`,
        },
    }

    console.log('Signup attempt:', { email, role, full_name })

    const result = await supabase.auth.signUp(data)
    const { data: { user, session }, error } = result

    console.log('Signup result:', {
        hasUser: !!user,
        hasSession: !!session,
        error: error?.message,
        userConfirmed: user?.email_confirmed_at
    })

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

    if (!password || !confirmPassword) {
        redirect('/error?message=Both password fields are required.')
    }

    if (password !== confirmPassword) {
        redirect('/error?message=Passwords do not match.')
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        console.error('Reset password error:', error.message)
        redirect(`/error?message=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
