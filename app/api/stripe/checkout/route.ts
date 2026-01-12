import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getStripe, getOrCreateStripeCustomer } from '@/utils/stripe'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // 1. Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { packageId } = await req.json()

        if (!packageId) {
            return NextResponse.json({ error: 'Package ID is required' }, { status: 400 })
        }

        // 2. Fetch the credit package from database
        const { data: creditPackage, error: packageError } = await supabase
            .from('credit_packages')
            .select('*')
            .eq('id', packageId)
            .eq('is_active', true)
            .single()

        if (packageError || !creditPackage) {
            return NextResponse.json({ error: 'Package not found' }, { status: 404 })
        }

        // 3. Get user profile with stripe_customer_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, full_name')
            .eq('id', user.id)
            .single()

        // 4. Get or create Stripe customer
        const stripeCustomerId = await getOrCreateStripeCustomer(
            user.id,
            user.email!,
            profile?.full_name || undefined,
            profile?.stripe_customer_id
        )

        // 5. Update profile with stripe_customer_id if new
        if (!profile?.stripe_customer_id) {
            await supabase
                .from('profiles')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('id', user.id)
        }

        // 6. Create pending purchase record
        const { data: purchase, error: purchaseError } = await supabase
            .from('credit_purchases')
            .insert({
                user_id: user.id,
                package_id: creditPackage.id,
                credits_purchased: creditPackage.credits,
                amount_paid_cents: creditPackage.price_cents,
                currency: creditPackage.currency,
                status: 'pending'
            })
            .select()
            .single()

        if (purchaseError) throw purchaseError

        // 7. Create Stripe Checkout Session
        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const session = await getStripe().checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: creditPackage.currency,
                        unit_amount: creditPackage.price_cents,
                        product_data: {
                            name: `${creditPackage.name} - ${creditPackage.credits} Credits`,
                            description: creditPackage.description || `${creditPackage.credits} hours of 1-on-1 mentorship`
                        }
                    },
                    quantity: 1
                }
            ],
            metadata: {
                user_id: user.id,
                package_id: creditPackage.id,
                purchase_id: purchase.id,
                credits: creditPackage.credits.toString()
            },
            success_url: `${origin}/dashboard/student/credits/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/dashboard/student/credits?cancelled=true`
        })

        // 8. Update purchase with session ID
        await supabase
            .from('credit_purchases')
            .update({ stripe_session_id: session.id })
            .eq('id', purchase.id)

        return NextResponse.json({ url: session.url })

    } catch (error: any) {
        console.error('Checkout Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
