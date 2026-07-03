// Amount math for mentor invoices and payouts.
//
// This is the single source of truth for turning a session's duration + hourly
// rate into money, and for rolling line amounts up into invoice totals. Both the
// invoice-generation endpoints and the (later) invoice-driven payout code must
// import from here so the figures can never drift apart. Never trust amounts
// sent by the client — always recompute from session records with these helpers.

/** Fallback mentor rate when `mentors.hourly_rate_cents` is missing (£30/hr). */
export const DEFAULT_HOURLY_RATE_CENTS = 3000

/** Fallback session length when `sessions.duration_minutes` is missing. */
export const DEFAULT_DURATION_MINUTES = 60

/**
 * Amount owed for a single session: (minutes / 60) × hourly rate, rounded to the
 * nearest penny. Matches the calculation already used by the payout route.
 */
export function sessionAmountCents(
    durationMinutes: number | null | undefined,
    hourlyRateCents: number | null | undefined
): number {
    const minutes = durationMinutes ?? DEFAULT_DURATION_MINUTES
    const rate = hourlyRateCents ?? DEFAULT_HOURLY_RATE_CENTS
    return Math.round((minutes / 60) * rate)
}

export interface InvoiceTotals {
    subtotal_cents: number
    withholding_cents: number
    vat_cents: number
    total_cents: number
}

/**
 * Roll a set of line-item amounts into invoice totals.
 *   subtotal = Σ line amounts (gross pay)
 *   total    = subtotal − withholding + vat
 */
export function computeInvoiceTotals(
    lineAmountsCents: number[],
    withholdingCents = 0,
    vatCents = 0
): InvoiceTotals {
    const subtotal = lineAmountsCents.reduce((sum, a) => sum + a, 0)
    return {
        subtotal_cents: subtotal,
        withholding_cents: withholdingCents,
        vat_cents: vatCents,
        total_cents: subtotal - withholdingCents + vatCents,
    }
}
