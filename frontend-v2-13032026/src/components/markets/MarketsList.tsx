"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Market } from '@/lib/api/types/api';

import ProbabilityBar from '@/components/markets/ProbabilityBar';
import { useMarketTrades } from '@/hooks/useTrade';

/** Fetches and displays the trade count for a single market. */
function MarketTradeCount({ marketId }: { marketId: string }) {
  const { data } = useMarketTrades(marketId);
  if (data?.total === undefined) return null;
  return (
    <span className="text-xs text-secondary font-mono">
      {data.total.toLocaleString()}&nbsp;trades
    </span>
  );
}

interface MarketsListProps {
  markets: Market[];
  total: number;
  limit: number;
  offset: number;
  onPageChange?: (offset: number) => void;
  onFilterChange?: (status: 'OPEN' | 'PENDING' | 'CLOSED' | 'RESOLVED') => void;
  status: string;
}

export function MarketsList({ markets, total, limit, offset, onPageChange, onFilterChange, status }: MarketsListProps) {
  const pageCount = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading-lg font-semibold text-primary">Markets</h2>
        <select
          className="bg-elevated text-primary border border-subtle rounded-md px-3 py-2 focus:border-accent-blue focus:ring-2 focus:ring-accent-blue-dim"
          value={status}
          onChange={e => onFilterChange?.(e.target.value as 'OPEN' | 'PENDING' | 'CLOSED' | 'RESOLVED')}
        >
          <option value="OPEN">Open</option>
          <option value="PENDING">Pending</option>
          <option value="CLOSED">Closed</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>
      {markets.length === 0 ? (
        <div className="text-muted-foreground text-center py-12">No markets found.</div>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <li
              key={market.id}
              className="group bg-surface border border-subtle rounded-xl p-5 shadow-sm hover:border-active hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-3"
              tabIndex={0}
              role="button"
              onClick={() => router.push(`/markets/${market.id}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/markets/${market.id}`); }}
              aria-label={`View details for market: ${market.question}`}
            >
              {/* Header row: status badge (left) + closing date (right) */}
              <div className="flex items-center justify-between">
                {/* Status badge — top left */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    market.status === 'OPEN'
                      ? 'bg-yes-dim text-yes-strong border-[rgba(0,200,83,0.3)]'
                      : market.status === 'PENDING'
                        ? 'bg-[rgba(255,152,0,0.1)] text-warning border-[rgba(255,152,0,0.3)]'
                        : market.status === 'CLOSED'
                          ? 'bg-[rgba(139,146,165,0.1)] text-secondary border-[rgba(139,146,165,0.3)]'
                          : 'bg-accent-blue-dim text-primary border-[rgba(33,150,243,0.3)]'
                  }`}
                >
                  {market.status}
                </span>

                {/* Closing date — top right with clock icon */}
                <span className="flex items-center gap-1 text-xs text-secondary">
                  <svg width="11" height="11" fill="none" viewBox="0 0 14 14" aria-hidden="true">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {new Date(market.closes_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Question */}
              <p className="text-sm font-semibold text-primary leading-snug line-clamp-2">
                {market.question}
              </p>

              {/* Single probability bar */}
              <ProbabilityBar yesPrice={market.yes_price} noPrice={market.no_price} />

              {/* Footer: liquidity (left) + trade count (right) */}
              <div className="flex items-center justify-between pt-1 border-t border-subtle">
                <span className="text-xs text-secondary font-mono">
                  {market.liquidity_param
                    ? `Liquidity ${market.liquidity_param >= 1_000_000 ? `KES ${(market.liquidity_param / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : market.liquidity_param >= 1_000 ? `KES ${(market.liquidity_param / 1_000).toFixed(1).replace(/\.0$/, '')}K` : `KES ${market.liquidity_param}`}`
                    : 'Liquidity --'}
                </span>
                <MarketTradeCount marketId={market.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <div className="flex flex-col items-center gap-2 mt-6">
          <nav className="flex items-center gap-1" aria-label="Markets pagination">
            <button
              className="px-3 py-1.5 rounded-md border border-subtle text-sm text-secondary bg-transparent hover:bg-accent-blue-dim hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => onPageChange?.(offset - limit)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              ‹ Prev
            </button>
            {(() => {
              const pages: (number | '…')[] = [];
              if (pageCount <= 7) {
                for (let i = 1; i <= pageCount; i++) pages.push(i);
              } else {
                pages.push(1);
                if (currentPage > 3) pages.push('…');
                for (let i = Math.max(2, currentPage - 1); i <= Math.min(pageCount - 1, currentPage + 1); i++) pages.push(i);
                if (currentPage < pageCount - 2) pages.push('…');
                pages.push(pageCount);
              }
              return pages.map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-secondary text-sm select-none">…</span>
                ) : (
                  <button
                    key={p}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition ${
                      p === currentPage
                        ? 'bg-accent-blue text-white border border-accent-blue shadow-sm'
                        : 'border border-subtle text-secondary bg-transparent hover:bg-accent-blue-dim hover:text-primary'
                    }`}
                    onClick={() => onPageChange?.((p as number - 1) * limit)}
                    aria-current={p === currentPage ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              );
            })()}
            <button
              className="px-3 py-1.5 rounded-md border border-subtle text-sm text-secondary bg-transparent hover:bg-accent-blue-dim hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => onPageChange?.(offset + limit)}
              disabled={currentPage === pageCount}
              aria-label="Next page"
            >
              Next ›
            </button>
          </nav>
          <p className="text-xs text-subtle">
            Page {currentPage} of {pageCount} &middot; {total} market{total !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
