import React from 'react';
import { Trade } from '@/lib/api/types/api';
import { formatKES } from '@/lib/formatters';

interface TradeHistoryTableProps {
  trades: Trade[];
  isLoading?: boolean;
  className?: string;
}

export function TradeHistoryTable({ trades, isLoading = false, className = '' }: TradeHistoryTableProps) {
  if (isLoading) {
    return (
      <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
        <h3 className="heading-lg text-primary mb-4">Trade History</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-elevated rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-lg text-primary">Trade History</h3>
        <span className="text-xs text-primary bg-elevated px-2 py-1 rounded">
          {trades.length} trades
        </span>
      </div>

      {trades.length === 0 ? (
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
            Your trading activity will appear here once you start making trades
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle">
                <th className="text-left py-3 px-2 text-xs text-primary uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left py-3 px-2 text-xs text-primary uppercase tracking-wide">
                  Market
                </th>
                <th className="text-left py-3 px-2 text-xs text-primary uppercase tracking-wide">
                  Outcome
                </th>
                <th className="text-right py-3 px-2 text-xs text-primary uppercase tracking-wide">
                  Shares
                </th>
                <th className="text-right py-3 px-2 text-xs text-primary uppercase tracking-wide">
                  Cost
                </th>
                <th className="text-right py-3 px-2 text-xs text-primary uppercase tracking-wide">
                  Avg Price
                </th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-subtle hover:bg-elevated transition-colors">
                  <td className="py-3 px-2 text-primary font-mono tabular-nums text-xs">
                    {new Date(trade.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2 text-primary text-xs truncate max-w-50" title={trade.market_id}>
                    Market ID: {trade.market_id.slice(0, 8)}...
                  </td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      trade.outcome === 'YES' 
                        ? 'bg-yes-dim text-yes-strong' 
                        : 'bg-no-dim text-no-strong'
                    }`}>
                      {trade.outcome}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-primary font-mono tabular-nums text-right">
                    {trade.shares.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-primary font-mono tabular-nums text-right">
                    {formatKES(trade.cost_paid / 100)}
                  </td>
                  <td className="py-3 px-2 text-primary font-mono tabular-nums text-right">
                    {(trade.cost_paid / trade.shares).toFixed(1)}¢
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
