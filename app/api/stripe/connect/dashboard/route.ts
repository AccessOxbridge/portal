import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getAccountLoginLink } from '@/utils/stripe'

/**
 * Generate a login link for mentors to access their Stripe Express Dashboard
 */
export async function GET() {
    try {
        const supabase = await createClient()

        // 1. Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Get mentor's Stripe account ID
        const { data: mentor } = await supabase
            .from('mentors')
            .select('stripe_account_id, payouts_enabled')
            .eq('id', user.id)
            .single()

        if (!mentor?.stripe_account_id) {
            return NextResponse.json(
                { error: 'No Stripe account found. Please complete onboarding first.' },
                { status: 404 }
            )
        }

        if (!mentor.payouts_enabled) {
            return NextResponse.json(
                { error: 'Stripe account setup not complete. Please finish onboarding.' },
                { status: 400 }
            )
        }

        // 3. Generate login link
        const loginUrl = await getAccountLoginLink(mentor.stripe_account_id)

        return NextResponse.json({ url: loginUrl })

    } catch (error: any) {
        console.error('Stripe Dashboard Link Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate dashboard link' },
            { status: 500 }
        )
    }
}
