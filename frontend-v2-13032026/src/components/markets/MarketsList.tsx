"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Market } from '@/lib/api/types/api';
import { formatPrice } from '@/lib/formatters';
import ProbabilityBar from '@/components/markets/ProbabilityBar';

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
        <div className="text-muted text-center py-12">No markets found.</div>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <li
              key={market.id}
              className="bg-surface border border-subtle rounded-lg p-6 shadow-lg hover:border-active hover:shadow-2 transition duration-150 cursor-pointer"
              tabIndex={0}
              role="button"
              onClick={() => router.push(`/markets/${market.id}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/markets/${market.id}`); }}
              aria-label={`View details for market: ${market.question}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full border ${
                    market.status === 'OPEN'
                      ? 'bg-yes-dim text-yes-strong border-[rgba(0,200,83,0.3)]'
                      : market.status === 'PENDING'
                        ? 'bg-[rgba(255,152,0,0.15)] text-warning border-[rgba(255,152,0,0.3)]'
                        : market.status === 'CLOSED'
                          ? 'bg-[rgba(139,146,165,0.15)] text-primary border-[rgba(139,146,165,0.3)]'
                          : 'bg-accent-blue-dim text-primary border-[rgba(33,150,243,0.3)]'
                  }`}
                >
                  {market.status}
                </span>
                <span className="flex items-center text-xs font-bold px-2 py-1 rounded-full border bg-[rgba(255,152,0,0.15)] text-warning border-[rgba(255,152,0,0.3)] ml-auto">
                  <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="mr-1"><circle cx="7" cy="7" r="6" stroke="#FF9800" strokeWidth="2"/><path d="M7 4v3l2 2" stroke="#FF9800" strokeWidth="2" strokeLinecap="round"/></svg>
                  {new Date(market.closes_at).toLocaleDateString()}
                </span>
              </div>
              <div className="text-heading-md font-semibold mb-2 text-primary">{market.question}</div>
              <div className="flex flex-col gap-4 mt-4">
                {/* Shared ProbabilityBar with YES/NO percentages and bar */}
                <ProbabilityBar yesPrice={market.yes_price} noPrice={market.no_price} />
                {/* Outcome Pills */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-4 py-2 rounded-md bg-yes-dim border border-[rgba(0,200,83,0.35)] text-yes-strong font-mono font-bold text-lg gap-2">
                    {/* Up icon SVG */}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3v12M9 3l-4 4M9 3l4 4" stroke="#00c853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Yes {typeof market.yes_price === 'number' ? formatPrice(market.yes_price, 'percent') : '--'}
                  </span>
                  <span className="inline-flex items-center px-4 py-2 rounded-md bg-no-dim border border-[rgba(255,23,68,0.35)] text-no-strong font-mono font-bold text-lg gap-2">
                    {/* Down icon SVG */}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 15V3M9 15l-4-4M9 15l4-4" stroke="#ff1744" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    No {typeof market.no_price === 'number' ? formatPrice(market.no_price, 'percent') : '--'}
                  </span>
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className="text-body-sm text-primary font-mono">VOLUME</span>
                <span className="ml-3 text-body-sm text-primary font-mono">{market.liquidity_param ? market.liquidity_param : '--'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button

            className="px-3 py-1 rounded-md border border-subtle text-primary bg-transparent hover:bg-accent-blue-dim hover:text-primary transition disabled:opacity-50"
            onClick={() => onPageChange?.(offset - limit)}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span className="text-body-md text-primary">Page {currentPage} of {pageCount}</span>
          <button
            className="px-3 py-1 rounded-md border border-subtle text-primary bg-transparent hover:bg-accent-blue-dim hover:text-primary transition disabled:opacity-50"
            onClick={() => onPageChange?.(offset + limit)}
            disabled={currentPage === pageCount}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
