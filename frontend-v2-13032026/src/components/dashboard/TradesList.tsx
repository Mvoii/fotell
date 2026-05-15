import React from 'react';
import { useTrades } from '@/hooks/useUser';
import { formatPrice } from '@/lib/formatters';
import type { Trade } from '@/lib/api/types/api';
import Link from 'next/link';

interface TradesListProps {
  className?: string;
}

export function TradesList({ className = '' }: TradesListProps) {
  const { data: tradesData, isLoading, error } = useTrades();

  return (
    <div className={`bg-surface border border-subtle rounded-lg shadow-sm w-full overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-subtle bg-base flex items-center justify-between">
        <h3 className="heading-sm font-semibold text-primary">Recent Trades</h3>
      </div>

      {isLoading && (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-elevated rounded"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 text-error text-sm">
          Unable to load trades
        </div>
      )}

      {!isLoading && !error && tradesData?.trades && tradesData.trades.length === 0 && (
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
            No trades yet
          </p>
          <p className="text-primary text-xs">
            Your trading activity will appear here once you place a trade.
          </p>
        </div>
      )}

      {!isLoading && !error && tradesData?.trades && tradesData.trades.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-base text-xs font-medium text-muted uppercase tracking-wider">
                <th className="px-4 py-2 border-b border-subtle">Market</th>
                <th className="px-4 py-2 border-b border-subtle">Time</th>
                <th className="px-4 py-2 border-b border-subtle">Outcome</th>
                <th className="px-4 py-2 border-b border-subtle">Shares</th>
                <th className="px-4 py-2 border-b border-subtle text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {tradesData.trades.map((trade: Trade) => {
                const totalCostDollars = trade.cost_paid / 100;
                const pricePerShare = trade.cost_paid / trade.shares; // in cents = percentage
                const date = new Date(trade.created_at);
                const timeString = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                const isYes = trade.outcome === 'YES';

                return (
                  <tr key={trade.id} className="hover:bg-base transition-colors">
                    <td className="px-4 py-3 text-sm text-primary">
                      <Link href={`/markets/${trade.market_id}`} className="hover:underline text-accent-blue">
                        View Market
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-primary whitespace-nowrap">
                      {timeString}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                          isYes
                            ? 'bg-yes-dim text-yes-strong border border-[rgba(0,200,83,0.35)]'
                            : 'bg-no-dim text-no-strong border border-[rgba(255,23,68,0.35)]'
                        }`}
                      >
                        {trade.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-primary font-mono">
                      {trade.shares.toFixed(2)} @ {formatPrice(pricePerShare, 'percent')}
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
      )}
    </div>
  );
}
