import type { Market, Position } from '@/lib/api/types/api';
import { formatCentsAsKES } from '@/lib/formatters';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface SettlementResultsPanelProps {
  market: Market;
  position: Position | null;
}

export function SettlementResultsPanel({ market, position }: SettlementResultsPanelProps) {
  if (market.status !== 'RESOLVED' || !position) {
    return null;
  }

  // If user has 0 yes_shares and 0 no_shares, they don't actually hold a position
  if (position.yes_shares === 0 && position.no_shares === 0) {
    return null;
  }

  const isSettled = position.realized_pnl !== null;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSettled) {
      const intervalId = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.user.positions() });
        queryClient.invalidateQueries({ queryKey: queryKeys.user.balance() });
      }, 3000);
      return () => clearInterval(intervalId);
    }
  }, [isSettled, queryClient]);

  if (!isSettled) {
    return (
      <div className="mt-6 rounded-2xl border border-subtle bg-surface px-5 py-4 shadow-sm flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-primary">Settlement Pending</span>
          <span className="text-xs text-muted-foreground">Your position is being settled. Payouts will be processed shortly.</span>
        </div>
        <div className="text-sm font-mono text-muted-foreground animate-pulse">
          Processing...
        </div>
      </div>
    );
  }

  const payoutCents = position.cost_basis + (position.realized_pnl ?? 0);
  const isProfit = (position.realized_pnl ?? 0) >= 0;
  
  const hasYesShares = position.yes_shares > 0;
  const hasNoShares = position.no_shares > 0;
  const winningOutcome = market.resolved_outcome;

  return (
    <div className="mt-6 rounded-2xl border border-subtle bg-surface overflow-hidden shadow-sm">
      <div className="bg-surface-elevated px-5 py-3 border-b border-subtle">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Settlement Results
        </h3>
      </div>
      
      <div className="px-5 py-4 grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Payout</span>
          <span className="text-lg font-mono font-bold text-primary">{formatCentsAsKES(payoutCents)}</span>
        </div>
        
        <div className="flex flex-col gap-1 text-right">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Realized P&L</span>
          <span className={`text-lg font-mono font-bold ${isProfit ? 'text-success' : 'text-error'}`}>
            {isProfit ? '+' : ''}{formatCentsAsKES(position.realized_pnl ?? 0)}
          </span>
        </div>

        <div className="flex flex-col gap-2 col-span-2 mt-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Your Positions</span>
          <div className="flex gap-2 flex-wrap">
            {hasYesShares && (
              <span className={`text-sm px-3 py-1.5 rounded-md font-mono border ${winningOutcome === 'YES' ? 'bg-yes-dim text-yes-strong border-[rgba(0,200,83,0.3)]' : 'bg-surface-elevated text-muted-foreground border-subtle'}`}>
                {position.yes_shares.toLocaleString(undefined, { maximumFractionDigits: 2 })} YES {winningOutcome === 'YES' ? '(Won)' : '(Lost)'}
              </span>
            )}
            {hasNoShares && (
              <span className={`text-sm px-3 py-1.5 rounded-md font-mono border ${winningOutcome === 'NO' ? 'bg-no-dim text-no-strong border-[rgba(255,23,68,0.3)]' : 'bg-surface-elevated text-muted-foreground border-subtle'}`}>
                {position.no_shares.toLocaleString(undefined, { maximumFractionDigits: 2 })} NO {winningOutcome === 'NO' ? '(Won)' : '(Lost)'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
