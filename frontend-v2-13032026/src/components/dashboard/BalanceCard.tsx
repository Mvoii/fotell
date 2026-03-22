import React from 'react';
import { useBalance } from '@/hooks/useUser';
import { formatKES } from '@/lib/formatters';

interface BalanceCardProps {
  className?: string;
}

export function BalanceCard({ className = '' }: BalanceCardProps) {
  const { data: balance, isLoading, error, refetch } = useBalance();

  const handleRefresh = () => {
    refetch();
  };

  // Ensure consistent disabled state to prevent hydration mismatch
  const isDisabled = isLoading || false; // Always false initially to match SSR

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-lg text-primary">Account Balance</h3>
        <button
          onClick={handleRefresh}
          disabled={isDisabled}
          className="text-primary hover:text-primary transition-colors disabled:opacity-50"
          title="Refresh balance"
        >
          <svg 
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-8 bg-elevated rounded w-32 mb-2"></div>
            <div className="h-4 bg-elevated rounded w-24"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="space-y-3">
          <div className="text-error text-sm">
            Unable to load balance
          </div>
          <button
            onClick={handleRefresh}
            className="text-primary hover:text-primary-hover text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {balance && !isLoading && !error && (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-primary text-xs uppercase tracking-wide">
              Available Balance
            </div>
            <div 
              className="text-primary font-mono tabular-nums"
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              {formatKES(balance.balance_kes)}
            </div>
          </div>

          <div className="pt-3 border-t border-subtle">
            <div className="space-y-1">
              <div className="text-primary text-xs uppercase tracking-wide">
                Balance Details
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">KES Amount:</span>
                  <span className="text-primary font-mono tabular-nums">
                    {balance.balance_kes.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary">Smallest Units:</span>
                  <span className="text-primary font-mono tabular-nums">
                    {balance.balance_smallest_unit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
