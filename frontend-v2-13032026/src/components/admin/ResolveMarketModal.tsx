import React, { useState } from 'react';
import { useResolveMarket } from '@/hooks/useAdmin';
import { Market } from '@/lib/api/types/api';

interface ResolveMarketModalProps {
  market: Market;
  isOpen: boolean;
  onClose: () => void;
}

export function ResolveMarketModal({ market, isOpen, onClose }: ResolveMarketModalProps) {
  const [outcome, setOutcome] = useState<'YES' | 'NO' | null>(null);
  const resolveMutation = useResolveMarket();

  if (!isOpen) return null;

  const handleResolve = async () => {
    if (!outcome) return;
    try {
      await resolveMutation.mutateAsync({ marketId: market.id, outcome });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface border border-danger/50 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-subtle bg-danger/10">
          <h2 className="heading-lg text-danger flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Resolve Market
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-muted mb-1">Question</p>
            <p className="text-primary font-medium">{market.question}</p>
          </div>

          <div className="bg-danger/10 border border-danger/20 rounded-md p-4 text-danger text-sm">
            <strong>Irreversible Action Warning:</strong> Resolving a market is permanent. 
            This will immediately distribute payouts to the winning outcome and close all positions.
            This action cannot be undone.
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-3">Select Final Outcome</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOutcome('YES')}
                className={`py-3 px-4 rounded-md font-bold transition-all border ${
                  outcome === 'YES' 
                    ? 'bg-accent-green text-surface border-accent-green' 
                    : 'bg-surface text-accent-green border-accent-green/50 hover:bg-accent-green/10'
                }`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setOutcome('NO')}
                className={`py-3 px-4 rounded-md font-bold transition-all border ${
                  outcome === 'NO' 
                    ? 'bg-accent-red text-surface border-accent-red' 
                    : 'bg-surface text-accent-red border-accent-red/50 hover:bg-accent-red/10'
                }`}
              >
                NO
              </button>
            </div>
          </div>

          {resolveMutation.error && (
            <div className="text-danger text-sm text-center">
              Failed to resolve market. Please try again.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-subtle bg-base flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-primary hover:text-muted transition-colors"
            disabled={resolveMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResolve}
            disabled={!outcome || resolveMutation.isPending}
            className="px-6 py-2 bg-danger text-surface font-semibold rounded-md hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {resolveMutation.isPending ? 'Resolving...' : 'Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}
