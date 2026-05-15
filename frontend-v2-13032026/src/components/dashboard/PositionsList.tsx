import React from 'react';
import { usePositions } from '@/hooks/useUser';
import Link from 'next/link';
import { MarketName } from './MarketName';
import { formatKES } from '@/lib/formatters';

interface PositionsListProps {
  className?: string;
}

export function PositionsList({ className = '' }: PositionsListProps) {
  const { data: positions, isLoading, error } = usePositions();

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-lg text-primary">Your Positions</h3>
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
        <div className="text-primary text-sm p-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-lg">
          Unable to load positions
        </div>
      )}

      {!isLoading && !error && (
        <div>
          {(!positions || positions.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-secondary text-sm">You don't have any open positions yet.</p>
              <Link href="/markets" className="inline-block mt-4 text-sm bg-primary text-primary-inverse px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                Browse Markets
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => {
                const totalShares = position.yes_shares + position.no_shares;
                const dominantOutcome = position.yes_shares > position.no_shares ? 'YES' : 'NO';
                
                return (
                  <div key={position.market_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-subtle rounded-lg bg-base hover:bg-surface transition-colors">
                    <div className="mb-3 sm:mb-0">
                      <Link href={`/markets/${position.market_id}`} className="font-semibold text-primary hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 mb-1">
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
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${dominantOutcome === 'YES' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {dominantOutcome}
                        </span>
                        <span className="font-mono text-primary font-medium">{formatKES(position.cost_basis / 100)}</span>
                      </div>
                      {position.realized_pnl !== null && position.realized_pnl !== 0 && (
                        <div className={`text-xs font-medium ${position.realized_pnl > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          PnL: {position.realized_pnl > 0 ? '+' : ''}{formatKES(position.realized_pnl / 100)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
