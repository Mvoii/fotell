import React, { useState } from 'react';
import { useTrades } from '@/hooks/useUser';
import Link from 'next/link';
import { MarketName } from './MarketName';
import { formatKES } from '@/lib/formatters';
import { formatTimeAgo } from '@/lib/utils';

interface TradesListProps {
  className?: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20];

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
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="Trades pagination">
      <button
        className="px-3 py-1.5 rounded-md border border-subtle text-sm text-muted-foreground bg-transparent hover:bg-accent-blue-dim hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹ Prev
      </button>
      {pages.map((p, idx) =>
        p === '…' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            className={`w-8 h-8 rounded-md text-sm font-medium transition ${
              p === currentPage
                ? 'bg-accent-blue text-white border border-accent-blue shadow-sm'
                : 'border border-subtle text-muted-foreground bg-transparent hover:bg-accent-blue-dim hover:text-primary'
            }`}
            onClick={() => onPageChange(p as number)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        className="px-3 py-1.5 rounded-md border border-subtle text-sm text-muted-foreground bg-transparent hover:bg-accent-blue-dim hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next ›
      </button>
    </nav>
  );
}

export function TradesList({ className = '' }: TradesListProps) {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const offset = (currentPage - 1) * pageSize;
  const { data: tradesData, isLoading, error } = useTrades(pageSize, offset);

  const trades = tradesData?.trades ?? [];
  const total = tradesData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-lg text-primary">Recent Trades</h3>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show</span>
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
        )}
      </div>

      {isLoading && (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-elevated rounded-lg"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-no-strong text-sm p-4 bg-no-dim rounded-lg">
          Unable to load trades
        </div>
      )}

      {!isLoading && !error && (
        <div>
          {trades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">You haven&apos;t made any trades yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {trades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 border border-subtle rounded-lg bg-base hover:bg-surface transition-colors">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${trade.outcome === 'YES' ? 'bg-yes-dim text-yes-strong' : 'bg-no-dim text-no-strong'}`}>
                          {trade.outcome}
                        </span>
                        <Link href={`/markets/${trade.market_id}`} className="text-sm font-medium text-primary hover:text-accent-blue truncate">
                          <MarketName marketId={trade.market_id} />
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(trade.created_at)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm text-primary font-medium">{trade.shares} Shares</div>
                      <div className="text-xs text-muted-foreground">Cost: {formatKES(trade.cost_paid / 100)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col items-center gap-1">
                <Paginator
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {total} trade{total !== 1 ? 's' : ''} total
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
