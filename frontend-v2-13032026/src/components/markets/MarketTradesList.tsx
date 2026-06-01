import React, { useState } from 'react';
import { useMarketTrades } from '@/hooks/useTrade';
import { formatPrice } from '@/lib/formatters';
import type { Trade } from '@/lib/api/types/api';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function Paginator({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-3 border-t border-subtle" aria-label="Market trades pagination">
      <button
        className="px-3 py-1.5 rounded-md border border-subtle text-sm text-secondary bg-transparent hover:bg-accent-blue-dim hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹ Prev
      </button>
      {pages.map((p, idx) =>
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
            onClick={() => onPageChange(p as number)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        className="px-3 py-1.5 rounded-md border border-subtle text-sm text-secondary bg-transparent hover:bg-accent-blue-dim hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next ›
      </button>
    </nav>
  );
}

export function MarketTradesList({ marketId }: { marketId: string }) {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const offset = (currentPage - 1) * pageSize;
  const { data, isLoading, isError, error } = useMarketTrades(marketId, pageSize, offset);

  const trades = data?.trades ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-subtle rounded-lg shadow-sm w-full overflow-hidden">
        <div className="px-4 py-3 border-b border-subtle bg-base">
          <h3 className="text-heading-sm font-semibold text-primary">Recent Trades</h3>
        </div>
        <div className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse h-10 bg-elevated rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-error text-sm py-4">
        Failed to load trades. {error?.message}
      </div>
    );
  }

  if (trades.length === 0 && currentPage === 1) {
    return <div className="text-muted-foreground text-sm py-4">No trades yet.</div>;
  }

  return (
    <div className="bg-surface border border-subtle rounded-lg shadow-sm w-full overflow-hidden">
      <div className="px-4 py-3 border-b border-subtle bg-base flex items-center justify-between">
        <h3 className="text-heading-sm font-semibold text-primary">Recent Trades</h3>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-xs text-secondary">{total} total</span>
          )}
          <select
            className="text-xs bg-elevated border border-subtle rounded px-2 py-1 text-primary focus:outline-none focus:border-accent-blue"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            aria-label="Trades per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-base text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2 border-b border-subtle">Time</th>
              <th className="px-4 py-2 border-b border-subtle">Outcome</th>
              <th className="px-4 py-2 border-b border-subtle">Shares</th>
              <th className="px-4 py-2 border-b border-subtle">Price/Share</th>
              <th className="px-4 py-2 border-b border-subtle text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {trades.map((trade: Trade) => {
              const totalCostDollars = trade.cost_paid / 100;
              const pricePerShare = trade.cost_paid / trade.shares; // in cents = percentage
              const date = new Date(trade.created_at);
              const timeString = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              const isYes = trade.outcome === 'YES';

              return (
                <tr key={trade.id} className="hover:bg-base transition-colors">
                  <td className="px-4 py-3 text-sm text-primary whitespace-nowrap">
                    {timeString}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-bold ${isYes
                          ? 'bg-yes-dim text-yes-strong border border-[rgba(0,200,83,0.35)]'
                          : 'bg-no-dim text-no-strong border border-[rgba(255,23,68,0.35)]'
                        }`}
                    >
                      {trade.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-primary font-mono">
                    {trade.shares.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-primary font-mono">
                    {formatPrice(pricePerShare, 'percent')}
                  </td>
                  <td className="px-4 py-3 text-sm text-primary font-mono text-right">
                    ${totalCostDollars.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginator
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
