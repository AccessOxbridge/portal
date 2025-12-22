'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                full_name: formData.get('full_name') as string,
                role: formData.get('role') as string,
            },
        },
    }

    console.log('Signup attempt:', { email: data.email, role: data.options.data.role, full_name: data.options.data.full_name })

    const result = await supabase.auth.signUp(data)
    const { error } = result

    console.log('Signup result:', JSON.stringify(result, null, 2))

    if (error) {
        console.error('Signup error:', error.message)
        redirect(`/error?message=${encodeURIComponent(error.message)}`)
    }

    if (!result.data.session && result.data.user) {
        // Confirmation required
        redirect('/error?message=' + encodeURIComponent('Please check your email to confirm your account before logging in.'))
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
