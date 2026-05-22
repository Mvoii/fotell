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
