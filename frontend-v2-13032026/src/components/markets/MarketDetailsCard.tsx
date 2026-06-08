import React from 'react';
import type { Market, MarketPrices } from '@/lib/api/types/api';
import MarketStatusBadge from '@/components/markets/MarketStatusBadge';
import ProbabilityBar from '@/components/markets/ProbabilityBar';

interface MarketDetailsCardProps {
  market: Market;
  prices?: MarketPrices;
  tradesTotal?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format a number as compact KES: KES 40K, KES 1.2M, etc. */
function formatLiquidityKES(value: number): string {
  if (value >= 1_000_000) return `KES ${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000)     return `KES ${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `KES ${value}`;
}

/** Compute payout multiplier from a 0-100 cent price. */
function multiplier(price: number | null): string {
  if (price === null || price <= 0) return '--';
  return `${(100 / price).toFixed(2)}×`;
}

/** "X min ago" / "X hr ago" from an ISO timestamp. */
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)          return 'just now';
  if (diff < 3600)        return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)       return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Short close-date label: "Jun 14" or "Jun 14, 2027". */
function formatCloseDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

// ── Status dot colours ────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  OPEN:     'bg-[#00C853]',
  PENDING:  'bg-[#FF9800]',
  CLOSED:   'bg-[#8B92A5]',
  RESOLVED: 'bg-[#2196F3]',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketDetailsCard({ market, prices, tradesTotal }: MarketDetailsCardProps) {
  const yesPrice  = prices?.yes_price  ?? market.yes_price;
  const noPrice   = prices?.no_price   ?? market.no_price;
  const yesLabel  = yesPrice !== null ? `${Math.round(yesPrice)}%`  : '--';
  const noLabel   = noPrice  !== null ? `${Math.round(noPrice)}%`   : '--';
  const yesMult   = multiplier(yesPrice);
  const noMult    = multiplier(noPrice);
  const isResolved = market.status === 'RESOLVED';
  const dotColor  = STATUS_DOT[market.status] ?? 'bg-[#8B92A5]';

  return (
    <article
      className="bg-surface border border-subtle rounded-2xl shadow-lg w-full flex flex-col overflow-hidden"
      aria-label={`Market: ${market.question}`}
    >
      {/* ── HEADER BAND ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0 gap-3">
        {/* Status dot + badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${dotColor} shadow-[0_0_6px_currentColor]`}
            aria-hidden="true"
          />
          <MarketStatusBadge status={market.status} size="sm" />
        </div>



        {/* Close / resolved date */}
        {isResolved && market.resolved_at ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4.5 7.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Resolved {formatCloseDate(market.resolved_at)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{formatCloseDate(market.closes_at)}</span>
          </div>
        )}
      </div>

      {/* ── QUESTION ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-0">
        <h1 className="text-base font-semibold text-primary leading-snug line-clamp-3">
          {market.question}
        </h1>
        {market.description && (
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {market.description}
          </p>
        )}
      </div>

      {/* ── PROBABILITY SECTION ──────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-0">
        {isResolved ? (
          /* Resolved outcome banner */
          <div className="flex flex-col items-center gap-2 py-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Outcome</span>
            <span
              className={`text-3xl font-extrabold font-mono tracking-tight ${
                market.resolved_outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'
              }`}
            >
              {market.resolved_outcome ?? '--'}
            </span>
          </div>
        ) : (
          <>
            {/* Percentage labels above bar */}
            <div className="flex items-end justify-between mb-2">
              <div className="flex flex-col items-start">
                <span className="text-2xl font-extrabold font-mono leading-none text-yes-strong">
                  {yesLabel}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Yes
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-extrabold font-mono leading-none text-no-strong">
                  {noLabel}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  No
                </span>
              </div>
            </div>

            {/* Thick split bar */}
            <ProbabilityBar yesPrice={yesPrice} noPrice={noPrice} showLabels={false} />
          </>
        )}
      </div>

      {/* ── OUTCOME ROWS (Kalshi-style) ──────────────────────────────────── */}
      {!isResolved && (
        <div className="px-5 pt-3 pb-0 flex flex-col gap-2">
          {/* YES row */}
          <div
            className="flex items-center justify-between rounded-xl border border-[rgba(0,200,83,0.2)] bg-yes-dim px-3 py-2.5 hover:bg-[rgba(0,200,83,0.12)] transition-colors duration-150"
            style={{ borderLeft: '3px solid rgba(0,200,83,0.6)' }}
          >
            <span className="text-sm font-semibold text-yes-strong">Yes</span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground font-mono">{yesMult}</span>
              <span className="text-sm font-bold font-mono text-yes-strong px-2.5 py-0.5 rounded-full bg-[rgba(0,200,83,0.15)] border border-[rgba(0,200,83,0.3)]">
                {yesLabel}
              </span>
            </div>
          </div>

          {/* NO row */}
          <div
            className="flex items-center justify-between rounded-xl border border-[rgba(255,23,68,0.2)] bg-no-dim px-3 py-2.5 hover:bg-[rgba(255,23,68,0.12)] transition-colors duration-150"
            style={{ borderLeft: '3px solid rgba(255,23,68,0.5)' }}
          >
            <span className="text-sm font-semibold text-no-strong">No</span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground font-mono">{noMult}</span>
              <span className="text-sm font-bold font-mono text-no-strong px-2.5 py-0.5 rounded-full bg-[rgba(255,23,68,0.1)] border border-[rgba(255,23,68,0.25)]">
                {noLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER STATS ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 mt-3 border-t border-subtle">
        {/* Liquidity */}
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
            <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground" />
          </svg>
          <span className="text-xs text-muted-foreground font-mono">
            Liquidity&nbsp;{formatLiquidityKES(market.liquidity_param)}
          </span>
        </div>

        {/* Trades count OR resolved outcome badge */}
        {market.resolved_outcome ? (
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              market.resolved_outcome === 'YES'
                ? 'text-yes-strong border-[rgba(0,200,83,0.4)] bg-yes-dim'
                : 'text-no-strong border-[rgba(255,23,68,0.3)] bg-no-dim'
            }`}
          >
            {market.resolved_outcome}
          </span>
        ) : tradesTotal !== undefined ? (
          <span className="text-xs text-muted-foreground font-mono">
            {tradesTotal.toLocaleString()}&nbsp;trades
          </span>
        ) : null}
      </div>
    </article>
  );
}
