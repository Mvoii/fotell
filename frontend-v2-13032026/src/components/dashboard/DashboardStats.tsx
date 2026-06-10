import React from 'react';
import { useBalance, usePositions } from '@/hooks/useUser';
import { formatKES } from '@/lib/formatters';
import type { Position } from '@/lib/api/types/api';

interface DashboardStatsProps {
  className?: string;
}

export function DashboardStats({ className = '' }: DashboardStatsProps) {
  const { data: balance } = useBalance();
  const { data: positions } = usePositions();

  // Normalise: API may return a bare array, a wrapped object, or nothing.
  // This guards against the `positions?.reduce is not a function` TypeError.
  const positionsArray: Position[] = Array.isArray(positions)
    ? positions
    : Array.isArray((positions as unknown as { positions?: Position[] })?.positions)
    ? (positions as unknown as { positions: Position[] }).positions
    : [];

  // Calculate portfolio value (placeholder - will be enhanced when positions are implemented)
  const positionsValue = positionsArray.reduce((total, position) => {
    // This is a simplified calculation - will be enhanced with current market prices
    return total + position.cost_basis;
  }, 0);

  const totalValue = (balance?.balance_kes || 0) + (positionsValue / 100); // Convert positions from cents to KES

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      <div className="bg-surface border border-subtle rounded-lg p-4">
        <div className="space-y-2">
          <div className="text-primary text-xs uppercase tracking-wide">
            Cash Balance
          </div>
          <div className="text-primary font-mono tabular-nums text-lg">
            {balance ? formatKES(balance.balance_kes) : 'KES 0.00'}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-subtle rounded-lg p-4">
        <div className="space-y-2">
          <div className="text-primary text-xs uppercase tracking-wide">
            Positions Value
          </div>
          <div className="text-primary font-mono tabular-nums text-lg">
            {formatKES(positionsValue / 100)}
          </div>
          <div className="text-xs text-primary">
            {positionsArray.length} position(s)
          </div>
        </div>
      </div>

      <div className="bg-surface border border-subtle rounded-lg p-4">
        <div className="space-y-2">
          <div className="text-primary text-xs uppercase tracking-wide">
            Total Portfolio Value
          </div>
          <div className="text-primary font-mono tabular-nums text-lg font-semibold">
            {formatKES(totalValue)}
          </div>
        </div>
      </div>
    </div>
  );
}
