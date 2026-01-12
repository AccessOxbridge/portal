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
