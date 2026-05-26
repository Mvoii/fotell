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
 * Estimate trade cost in KES from share count and **spot price**.
 *
 * ⚠️  LSMR APPROXIMATION WARNING
 * This is a **linear** (spot-price) estimate: `shares × priceCents / 100`.
 * The real LSMR marginal cost (returned as `receipt.cost_paid`) is always
 * **≥ this estimate** because the log-sum-exp cost function is convex —
 * each additional share moves the price up, so later shares cost more than
 * earlier ones. The gap grows with:
 *   - Larger trade sizes (more shares)
 *   - Lower `liquidity_param` (`b`) on the market (more price sensitivity)
 *
 * Use this only for pre-trade UI estimates. Always display `receipt.cost_paid`
 * via `formatCentsAsKES()` for the confirmed / executed cost.
 *
 * @param shares      Number of shares
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
