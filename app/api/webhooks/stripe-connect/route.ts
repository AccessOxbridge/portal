import { NextResponse } from 'next/server'
import { getStripe } from '@/utils/stripe'
import { createClient } from '@supabase/supabase-js'

// Use service role for webhook processing
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event

    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

    if (!webhookSecret) {
        console.warn('⚠️ STRIPE_CONNECT_WEBHOOK_SECRET is not set. Webhook verification skipped (NOT SECURE).')
        // In development, you might want to allow this, but let's be safe and require it or at least log clearly.
        // If you are using Stripe CLI, it will provide you with a secret.
        try {
            event = JSON.parse(body)
        } catch (err: any) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }
    } else {
        try {
            event = getStripe().webhooks.constructEvent(
                body,
                signature,
                webhookSecret
            )
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message)
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }
    }

    try {
        switch (event.type) {
            case 'account.updated': {
                // Mentor completed or updated their Stripe Connect account
                const account = event.data.object as any
                const mentorId = account.metadata?.mentor_id

                if (mentorId) {
                    await supabase
                        .from('mentors')
                        .update({
                            payouts_enabled: account.payouts_enabled === true,
                            stripe_account_id: account.id
                        })
                        .eq('id', mentorId)

                    console.log(`Updated mentor ${mentorId}: payouts_enabled=${account.payouts_enabled}`)
                }
                break
            }

            case 'transfer.created': {
                // Transfer to connected account was created.
                // Transfers are synchronous, so we can treat this as "paid".
                const transfer = event.data.object as any
                const payoutId = transfer.metadata?.payout_id

                if (payoutId) {
                    await supabase
                        .from('mentor_payouts')
                        .update({
                            stripe_transfer_id: transfer.id,
                            status: 'paid',
                            processed_at: new Date().toISOString(),
                            paid_at: new Date().toISOString()
                        })
                        .eq('id', payoutId)

                    console.log(`Transfer created and payout ${payoutId} marked as paid`)
                }
                break
            }
            case 'transfer.updated': {
                // Transfer object has limited status information; we mostly expect
                // the initial "created" event above. Keep this handler defensive
                // in case Stripe adds more states or the transfer is reversed.
                const transfer = event.data.object as any
                const payoutId = transfer.metadata?.payout_id

                if (!payoutId) break

                // Normalize handling based on transfer.status
                const status = (transfer.status as string | undefined) || undefined

                if (status === 'paid') {
                    await supabase
                        .from('mentor_payouts')
                        .update({
                            status: 'paid',
                            paid_at: new Date().toISOString()
                        })
                        .eq('id', payoutId)

                    console.log(`Payout ${payoutId} marked as paid`)
                } else if (status === 'failed' || status === 'returned') {
                    await supabase
                        .from('mentor_payouts')
                        .update({
                            status: 'failed',
                            failure_message: transfer.failure_message || 'Transfer failed'
                        })
                        .eq('id', payoutId)

                    console.log(`Payout ${payoutId} marked as failed`)
                } else {
                    // For any other status we *do not* downgrade or overwrite the
                    // payout status — the admin API already set it to "paid" when
                    // the transfer was created. Just log and leave the DB row as-is.
                    console.log(`Payout ${payoutId} transfer.updated with non-terminal status=${status}`)
                }
                break
            }

            default:
                console.log(`Unhandled Connect event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('Webhook processing error:', error)
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        )
    }
}
