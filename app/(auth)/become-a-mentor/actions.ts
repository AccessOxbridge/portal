'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Hard-coded. Never read role from the form, query string, or metadata the
// client sends. This action is the only public account-creation path and it
// may mint mentor accounts, never student / admin / client.
const MENTOR_ROLE = 'mentor' as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 50

function fail(code: string): never {
    redirect(`/become-a-mentor?error=${encodeURIComponent(code)}`)
}

function isStrongPassword(password: string): boolean {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
    )
}

export async function registerMentor(formData: FormData) {
    // Bots that fill hidden fields are dropped without creating an account.
    const honeypot = String(formData.get('company_website') || '').trim()
    if (honeypot) {
        redirect('/login')
    }

    const supabase = await createClient()
    const {
        data: { user: existing },
    } = await supabase.auth.getUser()
    if (existing) {
        redirect('/dashboard')
    }

    const fullName = String(formData.get('full_name') || '').trim()
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirm_password') || '')

    if (!fullName || fullName.length < 2 || fullName.length > 100) {
        fail('invalid_name')
    }
    if (!email || !EMAIL_RE.test(email)) {
        fail('invalid_email')
    }
    if (!isStrongPassword(password)) {
        fail('weak_password')
    }
    if (password !== confirmPassword) {
        fail('password_mismatch')
    }

    const admin = createAdminClient()

    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const { count: recentCount, error: countError } = await admin
        .from('mentors')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', windowStart)

    if (countError) {
        console.error('registerMentor rate-limit count failed:', countError.message)
        fail('failed')
    }
    if ((recentCount ?? 0) >= RATE_MAX) {
        fail('rate_limited')
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role: MENTOR_ROLE,
        },
    })

    if (createError || !created.user) {
        const message = (createError?.message || '').toLowerCase()
        if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
            fail('exists')
        }
        console.error('registerMentor createUser failed:', createError?.message)
        fail('failed')
    }

    const userId = created.user.id

    const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

    if (!profile || profile.role !== MENTOR_ROLE) {
        console.error('registerMentor refused: profile role was not mentor', {
            userId,
            role: profile?.role ?? null,
        })
        await admin.auth.admin.deleteUser(userId)
        fail('failed')
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (signInError) {
        console.error('registerMentor sign-in failed after create:', signInError.message)
        redirect('/login?error=' + encodeURIComponent('Account created. Please log in to continue your application.'))
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard/mentor/onboarding')
}
