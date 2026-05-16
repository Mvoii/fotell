import React from 'react';
import { useTrades } from '@/hooks/useUser';
import Link from 'next/link';
import { MarketName } from './MarketName';
import { formatKES } from '@/lib/formatters';

interface TradesListProps {
  className?: string;
}

export function TradesList({ className = '' }: TradesListProps) {
  const { data: tradesData, isLoading, error } = useTrades();

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-lg text-primary">Recent Trades</h3>
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
          {(!tradesData?.trades || tradesData.trades.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-secondary text-sm">You haven't made any trades yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tradesData.trades.map((trade) => (
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
                    <div className="text-xs text-secondary">
                      {new Date(trade.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-primary font-medium">{trade.shares} Shares</div>
                    <div className="text-xs text-secondary">Cost: {formatKES(trade.cost_paid / 100)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
