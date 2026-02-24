import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { createConnectedAccount, getAccountOnboardingLink } from '@/utils/stripe'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // 1. Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Verify user is a mentor
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name, email')
            .eq('id', user.id)
            .single()

        if (!profile || !['mentor', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Only mentors can onboard to Stripe Connect' }, { status: 403 })
        }

        // 3. Check if mentor already has a Stripe account
        const { data: mentor } = await supabase
            .from('mentors')
            .select('stripe_account_id, payouts_enabled')
            .eq('id', user.id)
            .single()

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const returnUrl = `${origin}/dashboard/mentor/training?step=payment&stripe_onboarding=complete`
        const refreshUrl = `${origin}/api/stripe/connect/refresh`

        let accountId = mentor?.stripe_account_id

        // 4. Create new account if doesn't exist
        if (!accountId) {
            try {
                accountId = await createConnectedAccount(
                    user.id,
                    profile.email || user.email!,
                    profile.full_name || undefined
                )

                // Save account ID to database
                await supabase
                    .from('mentors')
                    .update({ stripe_account_id: accountId })
                    .eq('id', user.id)
            } catch (err: any) {
                // If Stripe Connect isn't enabled, return a helpful error to the client
                if (err?.code === 'STRIPE_CONNECT_NOT_ENABLED' || /signed up for Connect/i.test(err?.message || '')) {
                    console.error('Stripe Connect onboarding blocked - platform Connect not enabled:', err.message)
                    return NextResponse.json({
                        error: 'Stripe Connect is not enabled for this platform. Please enable Connect in your Stripe dashboard or use a secret key with Connect permissions.'
                    }, { status: 400 })
                }

                throw err
            }
        } else if (!mentor?.payouts_enabled) {
            // Check if account is actually enabled (missed webhook)
            const { isAccountPayoutsEnabled } = await import('@/utils/stripe')
            const isEnabled = await isAccountPayoutsEnabled(accountId)

            if (isEnabled) {
                await supabase
                    .from('mentors')
                    .update({ payouts_enabled: true })
                    .eq('id', user.id)

                // Redirect back to dashboard to show success
                return NextResponse.json({ url: returnUrl })
            }
        }

        // 5. Generate onboarding link
        const onboardingUrl = await getAccountOnboardingLink(accountId, returnUrl, refreshUrl)

        return NextResponse.json({ url: onboardingUrl })

    } catch (error: any) {
        console.error('Stripe Connect Onboarding Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create onboarding link' },
            { status: 500 }
        )
    }
}
