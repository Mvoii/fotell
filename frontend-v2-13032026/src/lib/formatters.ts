/**
 * Currency helpers for KES ↔ cents conversion.
 * API contract: all monetary values are in **cents** (integer).
 * 100 cents = 1 KES.
 */

/** Convert cents (smallest unit from API) to KES. */
export function toKES(cents: number): number {
  return cents / 100;
}

/** Convert KES to cents for API requests. */
export function fromKES(kes: number): number {
  return Math.round(kes * 100);
}

/** Format a KES amount for display (e.g. "KES 1,234.56"). */
export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a cents amount directly for display.
 * Converts from cents to KES first, then formats.
 */
export function formatCentsAsKES(cents: number): string {
  return formatKES(toKES(cents));
}

/** Format a price value (0-100 scale) as cents or percent. */
export function formatPrice(price: number, style: 'cents' | 'percent' = 'cents'): string {
  return style === 'cents'
    ? `${price.toFixed(1)}¢`
    : `${price.toFixed(1)}%`;
}

/**
 * Estimate trade cost in KES from share count and spot price.
 * Per API spec, prices are in cents (0–100 scale) and cost is LSMR-based.
 * This is a spot-price estimate: actual cost_paid (cents) from the receipt
 * should be displayed with formatCentsAsKES instead.
 *
 * @param shares  Number of shares
 * @param priceCents  Spot price in cents (yes_price / no_price, 0–100 range)
 */
export function estimateCostKES(shares: number, priceCents: number): number {
  return (shares * priceCents) / 100;
}

/**
 * Resolution payout in KES for a given share count.
 * Per API spec, each share resolves at 100 cents = 1 KES.
 *
 * @param shares  Number of shares held
 */
export function resolutionPayoutKES(shares: number): number {
  return shares; // 1 KES per share
}
