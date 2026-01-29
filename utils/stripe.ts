import Stripe from 'stripe'

// Server-side Stripe client - lazy loaded to avoid build-time errors
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2025-12-15.clover',
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
 * Create a transfer to a connected account (moves funds from platform to connected account)
 */
export async function createTransfer(
    accountId: string,
    amountCents: number,
    currency: string = 'gbp',
    metadata?: Record<string, string>
): Promise<string> {
    const transfer = await getStripe().transfers.create({
        amount: amountCents,
        currency,
        destination: accountId,
        metadata
    })

    return transfer.id
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
