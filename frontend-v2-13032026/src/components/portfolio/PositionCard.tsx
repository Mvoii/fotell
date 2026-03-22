import React from 'react';
import { PositionWithMarket } from '@/lib/api/types/api';
import { formatKES } from '@/lib/formatters';

interface PositionCardProps {
  position: PositionWithMarket;
  className?: string;
}

export function PositionCard({ position, className = '' }: PositionCardProps) {
  // Calculate position metrics (placeholder - will be enhanced with current market prices)
  const totalShares = position.yes_shares + position.no_shares;
  const costBasisKES = position.cost_basis / 100;
  const avgPrice = totalShares > 0 ? position.cost_basis / totalShares : 0;

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-4 hover:border-active transition-colors ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="heading-md text-primary truncate">
            {position.market?.question || 'Market Question'}
          </h4>
          <p className="text-xs text-primary mt-1">
            {position.market?.status && (
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                position.market.status === 'OPEN' ? 'bg-success/20 text-success' :
                position.market.status === 'CLOSED' ? 'bg-warning/20 text-warning' :
                position.market.status === 'RESOLVED' ? 'bg-info/20 text-info' :
                'bg-muted/20 text-muted'
              }`}>
                {position.market.status}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* YES Shares */}
        <div>
          <div className="text-xs text-primary uppercase tracking-wide mb-1">YES Shares</div>
          <div className="text-primary font-mono tabular-nums">
            {position.yes_shares.toFixed(2)}
          </div>
        </div>

        {/* NO Shares */}
        <div>
          <div className="text-xs text-primary uppercase tracking-wide mb-1">NO Shares</div>
          <div className="text-primary font-mono tabular-nums">
            {position.no_shares.toFixed(2)}
          </div>
        </div>

        {/* Total Cost */}
        <div>
          <div className="text-xs text-primary uppercase tracking-wide mb-1">Total Cost</div>
          <div className="text-primary font-mono tabular-nums">
            {formatKES(costBasisKES)}
          </div>
        </div>

        {/* Avg Price */}
        <div>
          <div className="text-xs text-primary uppercase tracking-wide mb-1">Avg Price</div>
          <div className="text-primary font-mono tabular-nums">
            {avgPrice.toFixed(1)}¢
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-subtle flex gap-2">
        <button className="flex-1 bg-accent-blue hover:bg-accent-blue-hover text-white py-1 px-3 rounded text-sm transition-colors">
          Trade More
        </button>
        <button className="flex-1 border border-subtle hover:bg-elevated text-primary py-1 px-3 rounded text-sm transition-colors">
          View Details
        </button>
      </div>

      {/* Realized P&L */}
      {position.realized_pnl !== null && position.realized_pnl !== undefined && (
        <div className="mt-3 pt-3 border-t border-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary uppercase tracking-wide">Realized P&amp;L</span>
            <span className={`font-mono tabular-nums text-sm ${
              position.realized_pnl >= 0 ? 'text-success' : 'text-error'
            }`}>
              {position.realized_pnl >= 0 ? '+' : ''}{formatKES(position.realized_pnl / 100)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
