'use client';

/**
 * UserHoldingsPanel — Sprint 2, Task 3
 *
 * Displays the authenticated user's active position in a specific market:
 *   • Shares held  (e.g. "100 YES shares")
 *   • Average entry price  (cost_basis / shares)
 *   • Current value  (shares × current AMM price)
 *   • Unrealised P&L  (current_value − cost_basis)
 *
 * Props:
 *   market    — full Market object (provides live yes_price / no_price in 0-100 scale)
 *   position  — user's Position record for this market
 *   outcome   — which outcome the user holds ("YES" | "NO")
 *
 * Design tokens (DESIGN_SYSTEM.md):
 *   bg-surface card  |  border-subtle  |  shadow elevation-2
 *   text-[#00c853]   for positive P&L  (yes-strong)
 *   text-[#ff1744]   for negative P&L  (no-strong)
 *   font-mono + tabular-nums for all financial numbers
 */

import React, { useMemo } from 'react';
import type { Market, Position } from '@/lib/api/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a KES cents value as a localised KES string.
 * e.g. 152350 → "KES 1,523.50"
 */
function formatKES(cents: number): string {
  const kes = cents / 100;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kes);
}

/**
 * Format a 0-100 cent price as a probability percentage.
 * e.g. 62 → "62.0¢"
 */
function formatCentPrice(cents: number): string {
  return `${cents.toFixed(1)}¢`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface StatRowProps {
  label: string;
  children: React.ReactNode;
}

function StatRow({ label, children }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-[11px] border-b border-[rgba(255,255,255,0.06)] last:border-0">
      <span className="text-[11px] font-medium tracking-wider uppercase text-[#8b92a5]">
        {label}
      </span>
      <span
        className="font-mono text-[13px] font-semibold text-[#f0f2f5]"
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}
      >
        {children}
      </span>
    </div>
  );
}

interface PnLBadgeProps {
  pnlCents: number;
}

function PnLBadge({ pnlCents }: PnLBadgeProps) {
  const positive = pnlCents >= 0;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[2px] rounded-sm text-[12px] font-semibold font-mono"
      style={{
        color:           positive ? '#00c853' : '#ff1744',
        backgroundColor: positive ? 'rgba(0,200,83,0.12)' : 'rgba(255,23,68,0.12)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
      }}
    >
      <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
      {positive ? '+' : ''}{formatKES(pnlCents)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Props
// ─────────────────────────────────────────────────────────────────────────────

export interface UserHoldingsPanelProps {
  /** Full market object — used to read the live AMM price. */
  market: Market;
  /**
   * The user's position record for this market.
   * The component reads either yes_shares or no_shares depending on `outcome`.
   */
  position: Position;
  /**
   * Which outcome leg the user holds.
   * Pass the outcome the user originally bought so the panel shows the right
   * share count and prices. If the user holds both legs the parent may render
   * two panels, one per outcome.
   */
  outcome: 'YES' | 'NO';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function UserHoldingsPanel({ market, position, outcome }: UserHoldingsPanelProps) {
  // ── Derived financials ────────────────────────────────────────────────────
  const derived = useMemo(() => {
    // Shares held for this specific outcome leg
    const shares = outcome === 'YES' ? position.yes_shares : position.no_shares;

    // Current AMM price (0-100 cent scale); null-safe fallback to 50
    const rawPrice = outcome === 'YES' ? market.yes_price : market.no_price;
    const currentPriceCents = rawPrice ?? 50;

    // cost_basis is stored in KES cents in the backend
    const costBasisCents = position.cost_basis;

    // Average entry price per share in cents
    // (cost_basis / total_shares is an approximation when a user holds both legs)
    const totalShares = position.yes_shares + position.no_shares;
    const avgEntryPriceCents = totalShares > 0 ? costBasisCents / totalShares : 0;

    // Current value: shares × price (in KES cents)
    // price is on 0-100 scale where 100 = KES 1 → multiply by 100 to get KES cents
    const currentValueCents = shares * currentPriceCents * 100;

    // Unrealised P&L vs full cost basis
    // (we attribute the full cost basis to one leg for simplicity;
    //  the parent can split this properly when rendering two panels)
    const unrealisedPnlCents = currentValueCents - costBasisCents;

    const pnlPct =
      costBasisCents > 0 ? (unrealisedPnlCents / costBasisCents) * 100 : 0;

    return {
      shares,
      currentPriceCents,
      costBasisCents,
      avgEntryPriceCents,
      currentValueCents,
      unrealisedPnlCents,
      pnlPct,
    };
  }, [market, position, outcome]);

  // Nothing to render when the user has no shares in this outcome
  if (derived.shares <= 0) return null;

  const {
    shares,
    currentPriceCents,
    costBasisCents,
    avgEntryPriceCents,
    currentValueCents,
    unrealisedPnlCents,
    pnlPct,
  } = derived;

  // Outcome-specific colours
  const outcomeColor  = outcome === 'YES' ? '#00c853' : '#ff1744';
  const outcomeBg     = outcome === 'YES' ? 'rgba(0,200,83,0.15)'  : 'rgba(255,23,68,0.15)';
  const outcomeBorder = outcome === 'YES' ? 'rgba(0,200,83,0.35)'  : 'rgba(255,23,68,0.35)';
  const pnlColor      = unrealisedPnlCents >= 0 ? '#00c853' : '#ff1744';

  return (
    <section
      aria-label={`Your ${outcome} Holdings`}
      className="rounded-lg transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
      style={{
        backgroundColor: '#1a1d23',
        border:          '1px solid rgba(255,255,255,0.06)',
        boxShadow:       '0 4px 12px rgba(0,0,0,0.5)',
        padding:         '20px 24px',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Portfolio icon */}
          <span
            className="flex items-center justify-center w-8 h-8 rounded-md text-[#2196f3] text-base select-none"
            style={{ backgroundColor: 'rgba(33,150,243,0.12)' }}
            aria-hidden="true"
          >
            ◈
          </span>
          <h2 className="text-[16px] font-semibold text-[#f0f2f5] leading-[1.4]">
            Your Holdings
          </h2>
        </div>

        {/* Outcome badge */}
        <span
          className="text-[11px] font-semibold tracking-[0.08em] uppercase px-2 py-[3px] rounded-sm"
          style={{
            color:           outcomeColor,
            backgroundColor: outcomeBg,
            border:          `1px solid ${outcomeBorder}`,
          }}
        >
          {outcome}
        </span>
      </div>

      {/* ── Shares — prominent hero number ─────────────────────────────── */}
      <div
        className="flex items-baseline gap-2 mb-5 px-3 py-3 rounded-md"
        style={{ backgroundColor: '#22262f' }}
      >
        <span
          className="font-mono text-[26px] font-bold leading-none"
          style={{
            color: outcomeColor,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {shares.toLocaleString('en-KE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })}
        </span>
        <span className="text-[13px] font-medium text-[#8b92a5]">
          {outcome} shares
        </span>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div>
        <StatRow label="Cost Basis">
          {formatKES(costBasisCents)}
        </StatRow>

        <StatRow label="Avg Entry Price">
          <span
            style={{ fontVariantNumeric: 'tabular-nums' }}
            className="font-mono"
          >
            {formatCentPrice(avgEntryPriceCents)} / share
          </span>
        </StatRow>

        <StatRow label="Current Price">
          <span
            style={{
              color: currentPriceCents >= 50 ? outcomeColor : '#8b92a5',
              fontVariantNumeric: 'tabular-nums',
            }}
            className="font-mono"
          >
            {formatCentPrice(currentPriceCents)} / share
          </span>
        </StatRow>

        <StatRow label="Current Value">
          {formatKES(currentValueCents)}
        </StatRow>

        {/* Unrealised P&L — highlighted row */}
        <div className="flex items-center justify-between pt-3">
          <span className="text-[11px] font-medium tracking-wider uppercase text-[#8b92a5]">
            Unrealised P&amp;L
          </span>
          <div className="flex items-center gap-2">
            <PnLBadge pnlCents={unrealisedPnlCents} />
            <span
              className="font-mono text-[11px] font-medium"
              style={{ color: pnlColor, fontVariantNumeric: 'tabular-nums' }}
            >
              ({unrealisedPnlCents >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────────────────── */}
      <p className="mt-4 text-[11px] leading-relaxed text-[#4a5063]">
        P&amp;L is unrealised and reflects the current AMM price. Actual proceeds
        on sale may differ due to slippage.
      </p>
    </section>
  );
}

export default UserHoldingsPanel;
