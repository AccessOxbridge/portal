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
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/0e9b57db-5534-496a-aad7-d2fdd61b30e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c623e4'},body:JSON.stringify({sessionId:'c623e4',runId:'pre-fix',hypothesisId:'H5',location:'app/api/webhooks/stripe-connect/route.ts:15',message:'stripe connect webhook hit',data:{hasSignature:!!signature,bodyLength:body.length,hasConnectSecret:!!process.env.STRIPE_CONNECT_WEBHOOK_SECRET},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/0e9b57db-5534-496a-aad7-d2fdd61b30e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c623e4'},body:JSON.stringify({sessionId:'c623e4',runId:'pre-fix',hypothesisId:'H5',location:'app/api/webhooks/stripe-connect/route.ts:42',message:'stripe connect signature verified',data:{eventType:event.type,eventId:event.id},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
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
                // Transfer to connected account was created
                const transfer = event.data.object as any
                const payoutId = transfer.metadata?.payout_id

                if (payoutId) {
                    await supabase
                        .from('mentor_payouts')
                        .update({
                            stripe_transfer_id: transfer.id,
                            status: 'processing',
                            processed_at: new Date().toISOString()
                        })
                        .eq('id', payoutId)

                    console.log(`Transfer created for payout ${payoutId}`)
                }
                break
            }
            case 'transfer.updated': {
                // Transfer status changed (use this instead of transfer.paid/transfer.failed)
                const transfer = event.data.object as any
                const payoutId = transfer.metadata?.payout_id

                if (!payoutId) break

                // Normalize handling based on transfer.status
                const status = transfer.status as string | undefined

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
                    // Other statuses (e.g., 'processing') — update basic info
                    await supabase
                        .from('mentor_payouts')
                        .update({
                            status: 'processing',
                            processed_at: new Date().toISOString(),
                            stripe_transfer_id: transfer.id
                        })
                        .eq('id', payoutId)

                    console.log(`Payout ${payoutId} processing / updated (status=${status})`)
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
