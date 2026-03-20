const UNIT = 1_000_000_000_000_000_000n; // BigInt for precision

export function toKES(smallestUnit: number | bigint): number {
  return Number(BigInt(smallestUnit) * 100n / UNIT) / 100;
}

export function fromKES(kes: number): bigint {
  return BigInt(Math.round(kes)) * UNIT;
}

export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPrice(price: number, style: 'cents' | 'percent' = 'cents'): string {
  return style === 'cents'
    ? `${price.toFixed(1)}¢`
    : `${price.toFixed(1)}%`;
}

export function toShares(smallestUnit: number): number {
  return Math.floor(Number(BigInt(smallestUnit) / UNIT));
}
