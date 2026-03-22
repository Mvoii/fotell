import React from 'react';
import { useTrades } from '@/hooks/useUser';

interface TradesListProps {
  className?: string;
}

export function TradesList({ className = '' }: TradesListProps) {
  const { data: tradesData, isLoading, error } = useTrades();

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-lg text-primary">Recent Trades</h3>
        <span className="text-xs text-primary bg-elevated px-2 py-1 rounded">
          Coming Soon
        </span>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-elevated rounded"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-primary text-sm">
          Unable to load trades
        </div>
      )}

      {!isLoading && !error && (
        <div className="text-center py-8">
          <div className="text-primary mb-2">
            <svg 
              className="w-12 h-12 mx-auto opacity-50" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          <p className="text-primary text-sm mb-1">
            Trade history is coming soon
          </p>
          <p className="text-primary text-xs">
            Once implemented, you&apos;ll see your complete trading activity here
          </p>
          {tradesData && tradesData.trades.length > 0 && (
            <p className="text-xs text-primary mt-2">
              Found {tradesData.trades.length} trade(s) in backend
            </p>
          )}
        </div>
      )}
    </div>
  );
}
