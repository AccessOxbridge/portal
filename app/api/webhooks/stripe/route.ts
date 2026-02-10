import { NextResponse } from 'next/server'
import { getStripe } from '@/utils/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Use service role for webhook handling (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
        event = getStripe().webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session

                const userId = session.metadata?.user_id
                const purchaseId = session.metadata?.purchase_id
                const credits = parseInt(session.metadata?.credits || '0', 10)

                if (!userId || !purchaseId || credits === 0) {
                    console.error('Missing metadata in session:', session.id)
                    break
                }

                // Check for idempotency - if purchase is already completed, skip
                const { data: existingPurchase } = await supabaseAdmin
                    .from('credit_purchases')
                    .select('status')
                    .eq('id', purchaseId)
                    .single()

                if (existingPurchase?.status === 'completed') {
                    console.log(`Purchase ${purchaseId} already completed, skipping.`)
                    break
                }

                // 1. Get current user credits
                const { data: profile, error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .select('credits')
                    .eq('id', userId)
                    .single()

                if (profileError) {
                    console.error('Failed to fetch profile:', profileError)
                    break
                }

                const currentCredits = profile?.credits || 0
                const newBalance = currentCredits + credits

                // 2. Update user credits
                const { error: updateError } = await supabaseAdmin
                    .from('profiles')
                    .update({ credits: newBalance })
                    .eq('id', userId)

                if (updateError) {
                    console.error('Failed to update credits:', updateError)
                    break
                }

                // 3. Update purchase record
                await supabaseAdmin
                    .from('credit_purchases')
                    .update({
                        status: 'completed',
                        stripe_payment_intent_id: session.payment_intent as string,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', purchaseId)

                // 4. Create transaction record
                await supabaseAdmin
                    .from('credit_transactions')
                    .insert({
                        user_id: userId,
                        amount: credits,
                        balance_after: newBalance,
                        type: 'purchase',
                        description: `Purchased ${credits} credits`,
                        reference_id: purchaseId
                    })

                // 5. Create notification for user
                await supabaseAdmin
                    .from('notifications')
                    .insert({
                        recipient_id: userId,
                        type: 'system',
                        title: 'Credits Added! 🎉',
                        message: `${credits} credits have been added to your account. You now have ${newBalance} credits available.`,
                        data: { credits, new_balance: newBalance }
                    })

                console.log(`✅ Added ${credits} credits to user ${userId}. New balance: ${newBalance}`)
                break
            }

            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge
                // Handle refunds - deduct credits if needed
                console.log('Refund received:', charge.id)
                // TODO: Implement refund logic based on your business rules
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('Webhook handler error:', error)
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        )
    }
}


