import React, { useState } from 'react';
import { usePositions } from '@/hooks/useUser';
import Link from 'next/link';
import { MarketName } from './MarketName';
import { formatKES } from '@/lib/formatters';
import type { Position } from '@/lib/api/types/api';

interface PositionsListProps {
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
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="Positions pagination">
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

export function PositionsList({ className = '' }: PositionsListProps) {
  const { data: positions, isLoading, error } = usePositions();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const positionsArray: Position[] = Array.isArray(positions)
    ? positions
    : Array.isArray((positions as unknown as { positions?: Position[] })?.positions)
    ? (positions as unknown as { positions: Position[] }).positions
    : [];

  const totalPages = Math.max(1, Math.ceil(positionsArray.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPositions = positionsArray.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-lg text-primary">Your Positions</h3>
        {positionsArray.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary">Show</span>
            <select
              className="text-xs bg-elevated border border-subtle rounded px-2 py-1 text-primary focus:outline-none focus:border-accent-blue"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              aria-label="Positions per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-elevated rounded-lg"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-no-strong text-sm p-4 bg-no-dim rounded-lg">
          Unable to load positions
        </div>
      )}

      {!isLoading && !error && (
        <div>
          {positionsArray.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary text-sm">You don't have any open positions yet.</p>
              <Link href="/markets" className="inline-block mt-4 text-sm bg-primary text-primary-inverse px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                Browse Markets
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedPositions.map((position) => {
                  const totalShares = position.yes_shares + position.no_shares;
                  const dominantOutcome = position.yes_shares > position.no_shares ? 'YES' : 'NO';

                  return (
                    <div key={position.market_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-subtle rounded-lg bg-base hover:bg-surface transition-colors">
                      <div className="mb-3 sm:mb-0">
                        <Link href={`/markets/${position.market_id}`} className="font-semibold text-primary hover:text-accent-blue transition-colors line-clamp-1 mb-1">
                          <MarketName marketId={position.market_id} />
                        </Link>
                        <div className="text-xs text-secondary flex items-center gap-2">
                          <span className="font-medium text-primary">{totalShares}</span> Shares
                          <span className="text-subtle">•</span>
                          <span>Avg Cost: {totalShares > 0 ? formatKES(position.cost_basis / totalShares) : '0.00'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${dominantOutcome === 'YES' ? 'bg-yes-dim text-yes-strong' : 'bg-no-dim text-no-strong'}`}>
                            {dominantOutcome}
                          </span>
                          <span className="font-mono text-primary font-medium">{formatKES(position.cost_basis / 100)}</span>
                        </div>
                        {position.realized_pnl !== null && position.realized_pnl !== 0 && (
                          <div className={`text-xs font-medium ${position.realized_pnl > 0 ? 'text-yes-strong' : 'text-no-strong'}`}>
                            PnL: {position.realized_pnl > 0 ? '+' : ''}{formatKES(position.realized_pnl / 100)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col items-center gap-1">
                <Paginator
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
                <p className="text-xs text-subtle mt-1">
                  {positionsArray.length} position{positionsArray.length !== 1 ? 's' : ''} total
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
