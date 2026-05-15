import React from 'react';
import { useMarketTrades } from '@/hooks/useTrade';
import { formatPrice } from '@/lib/formatters';
import type { Trade } from '@/lib/api/types/api';

export function MarketTradesList({ marketId }: { marketId: string }) {
  const { data, isLoading, isError, error } = useMarketTrades(marketId, 20);

  if (isLoading) {
    return <div className="text-muted text-sm py-4">Loading trades...</div>;
  }

  if (isError) {
    return (
      <div className="text-error text-sm py-4">
        Failed to load trades. {error?.message}
      </div>
    );
  }

  const trades = data?.trades || [];

  if (trades.length === 0) {
    return <div className="text-muted text-sm py-4">No trades yet.</div>;
  }

  return (
    <div className="bg-surface border border-subtle rounded-lg shadow-sm w-full overflow-hidden">
      <div className="px-4 py-3 border-b border-subtle bg-base">
        <h3 className="text-heading-sm font-semibold text-primary">Recent Trades</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-base text-xs font-medium text-muted uppercase tracking-wider">
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
    </div>
  );
}
