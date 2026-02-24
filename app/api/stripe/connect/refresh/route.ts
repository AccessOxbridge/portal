import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getAccountOnboardingLink } from '@/utils/stripe'

/**
 * Handles refresh URL redirects from Stripe when onboarding link expires
 * Generates a new onboarding link and redirects the user
 */
export async function GET(req: Request) {
    try {
        const supabase = await createClient()

        // 1. Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.redirect(new URL('/login', req.url))
        }

        // 2. Get mentor's Stripe account ID
        const { data: mentor } = await supabase
            .from('mentors')
            .select('stripe_account_id')
            .eq('id', user.id)
            .single()

        if (!mentor?.stripe_account_id) {
            // No account yet - redirect to training payment step
            return NextResponse.redirect(new URL('/dashboard/mentor/training?step=payment', req.url))
        }

        // 3. Generate new onboarding link
        const origin = new URL(req.url).origin
        const returnUrl = `${origin}/dashboard/mentor/training?step=payment&stripe_onboarding=complete`
        const refreshUrl = `${origin}/api/stripe/connect/refresh`

        const onboardingUrl = await getAccountOnboardingLink(
            mentor.stripe_account_id,
            returnUrl,
            refreshUrl
        )

        return NextResponse.redirect(onboardingUrl)

    } catch (error: any) {
        console.error('Stripe Connect Refresh Error:', error)
        return NextResponse.redirect(new URL('/dashboard/mentor?stripe_error=true', req.url))
    }
}
