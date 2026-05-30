import React from 'react';
import { useBalance, usePositions } from '@/hooks/useUser';
import { formatKES } from '@/lib/formatters';
import type { Position } from '@/lib/api/types/api';

interface PortfolioSummaryProps {
  className?: string;
}

export function PortfolioSummary({ className = '' }: PortfolioSummaryProps) {
  const { data: balance } = useBalance();
  const { data: positions } = usePositions();

  const positionsArray: Position[] = Array.isArray(positions)
    ? positions
    : Array.isArray((positions as unknown as { positions?: Position[] })?.positions)
    ? (positions as unknown as { positions: Position[] }).positions
    : [];

  // Calculate portfolio metrics (placeholder calculations)
  const positionsValue = positionsArray.reduce((total, position) => {
    return total + position.cost_basis;
  }, 0);

  const cashBalance = balance?.balance_smallest_unit || 0;
  const totalValue = cashBalance + positionsValue;
  const positionsValueKES = positionsValue / 100;

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <h3 className="heading-lg text-primary mb-6">Portfolio Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cash Balance */}
        <div className="space-y-2">
          <div className="text-xs text-primary uppercase tracking-wide">
            Cash Balance
          </div>
          <div className="text-primary font-mono tabular-nums text-xl">
            {balance ? formatKES(balance.balance_kes) : 'KES 0.00'}
          </div>
        </div>

        {/* Positions Value */}
        <div className="space-y-2">
          <div className="text-xs text-primary uppercase tracking-wide">
            Positions Value
          </div>
          <div className="text-primary font-mono tabular-nums text-xl">
            {formatKES(positionsValueKES)}
          </div>
          <div className="text-xs text-primary">
            {positionsArray.length} positions
          </div>
        </div>

        {/* Total Value */}
        <div className="space-y-2">
          <div className="text-xs text-primary uppercase tracking-wide">
            Total Value
          </div>
          <div className="text-primary font-mono tabular-nums text-xl font-semibold">
            {formatKES(totalValue / 100)}
          </div>
        </div>

        {/* Today's P&L (placeholder) */}
        <div className="space-y-2">
          <div className="text-xs text-primary uppercase tracking-wide">
            Today&apos;s P&amp;L
          </div>
          <div className="font-mono tabular-nums text-xl">
            <span className="text-primary">KES 0.00</span>
          </div>
          <div className="text-xs text-primary">
            Coming soon
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 pt-6 border-t border-subtle">
        <div className="flex items-center justify-between text-sm">
          <span className="text-primary">
            Portfolio breakdown and detailed analytics coming soon
          </span>
          <span className="text-xs bg-elevated px-2 py-1 rounded text-primary">
            Beta
          </span>
        </div>
      </div>
    </div>
  );
}
