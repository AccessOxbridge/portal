import Stripe from 'stripe'

// Server-side Stripe client - lazy loaded to avoid build-time errors
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            // Deliberately pinned. The installed SDK's types default to the
            // newest version it knows about (2026-02-25.clover), but changing
            // this string changes live Stripe API behaviour — response shapes
            // and defaults differ between versions — so it is a tested upgrade,
            // not a typecheck fix. The cast keeps the pin while satisfying TS.
            apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
            typescript: true
        })
    }
    return _stripe
}

// Get or create a Stripe customer for a user
export async function getOrCreateStripeCustomer(
    userId: string,
    email: string,
    name?: string,
    existingCustomerId?: string | null
): Promise<string> {
    // Return existing customer if we have one
    if (existingCustomerId) {
        return existingCustomerId
    }

    // Create new customer
    const customer = await getStripe().customers.create({
        email,
        name: name || undefined,
        metadata: {
            supabase_user_id: userId
        }
    })

    return customer.id
}

// Format price for display (e.g., 4900 -> £49.00)
export function formatPrice(cents: number, currency: string = 'gbp'): string {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(cents / 100)
}

// Credit package type (matches database schema)
export interface CreditPackage {
    id: string
    name: string
    credits: number
    price_cents: number
    currency: string
    stripe_price_id: string | null
    description: string | null
    is_popular: boolean | null
    is_active: boolean | null
    sort_order: number | null
}

// ==========================================
// Stripe Connect Functions
// ==========================================

/**
 * Create a Stripe Connect Express account for a mentor
 */
export async function createConnectedAccount(
    mentorId: string,
    email: string,
    name?: string
): Promise<string> {
    try {
        const account = await getStripe().accounts.create({
            type: 'express',
            country: 'GB', // UK-based platform
            email,
            business_type: 'individual',
            capabilities: {
                transfers: { requested: true }
            },
            metadata: {
                mentor_id: mentorId
            },
            settings: {
                payouts: {
                    schedule: {
                        interval: 'manual' // We control when payouts happen
                    }
                }
            }
        })

        return account.id
    } catch (err: any) {
        // Provide a clearer error when the platform account isn't enabled for Connect
        if (err?.rawType === 'invalid_request_error' && /signed up for Connect/i.test(err?.message || '')) {
            const e = new Error('Stripe Connect is not enabled for this platform. Sign up for Connect in your Stripe dashboard or use a secret key with Connect permissions.')
            // attach code for callers to detect
            ;(e as any).code = 'STRIPE_CONNECT_NOT_ENABLED'
            throw e
        }

        // Re-throw other errors
        throw err
    }
}

/**
 * Generate an onboarding link for a mentor to complete Stripe Connect setup
 */
export async function getAccountOnboardingLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
): Promise<string> {
    const link = await getStripe().accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
    })

    return link.url
}

/**
 * Generate a login link for mentors to access their Stripe Express Dashboard
 */
export async function getAccountLoginLink(accountId: string): Promise<string> {
    const link = await getStripe().accounts.createLoginLink(accountId)
    return link.url
}

/**
 * Check if a connected account is ready to receive payouts
 */
export async function isAccountPayoutsEnabled(accountId: string): Promise<boolean> {
    const account = await getStripe().accounts.retrieve(accountId)
    return account.payouts_enabled === true
}

/**
 * Create a transfer to a connected account (moves funds from platform to connected account).
 *
 * Pass `idempotencyKey` (e.g. the payout id) so retries / double-clicks / concurrent
 * requests never issue a second real transfer — Stripe returns the original transfer
 * for the same key instead of creating a new one.
 */
export async function createTransfer(
    accountId: string,
    amountCents: number,
    currency: string = 'gbp',
    metadata?: Record<string, string>,
    idempotencyKey?: string
): Promise<string> {
    const transfer = await getStripe().transfers.create(
        {
            amount: amountCents,
            currency,
            destination: accountId,
            metadata
        },
        idempotencyKey ? { idempotencyKey } : undefined
    )

    return transfer.id
}

/**
 * Create a payout on a connected account (moves funds from the mentor's Stripe
 * balance to their bank). This is the second hop after a Transfer — required
 * because connected accounts use a `manual` payout schedule (admin-controlled).
 *
 * `idempotencyKey` (e.g. `<payout_id>-bank`) prevents duplicate bank payouts on retry.
 */
export async function createPayout(
    accountId: string,
    amountCents: number,
    currency: string = 'gbp',
    metadata?: Record<string, string>,
    idempotencyKey?: string
): Promise<string> {
    const payout = await getStripe().payouts.create(
        {
            amount: amountCents,
            currency,
            metadata
        },
        {
            stripeAccount: accountId,
            ...(idempotencyKey ? { idempotencyKey } : {})
        }
    )

    return payout.id
}

/**
 * Get the balance of a connected account
 */
export async function getConnectedAccountBalance(accountId: string): Promise<{
    available: number
    pending: number
    currency: string
}> {
    const balance = await getStripe().balance.retrieve({
        stripeAccount: accountId
    })

    // Find GBP balance or default to first available
    const gbpAvailable = balance.available.find(b => b.currency === 'gbp')
    const gbpPending = balance.pending.find(b => b.currency === 'gbp')

    return {
        available: gbpAvailable?.amount || 0,
        pending: gbpPending?.amount || 0,
        currency: 'gbp'
    }
}
