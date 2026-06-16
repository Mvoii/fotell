import React, { useState } from 'react';
import { useResolveMarket } from '@/hooks/useAdmin';
import { Market } from '@/lib/api/types/api';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface ResolveMarketModalProps {
  market: Market;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Optional external resolve handler. When provided, the modal delegates
   * mutation responsibility to the parent (e.g. AdminMarketTable). When
   * omitted, the modal calls `useResolveMarket` directly.
   */
  onResolve?: (outcome: 'YES' | 'NO') => void;
}

export function ResolveMarketModal({ market, isOpen, onClose, onResolve }: ResolveMarketModalProps) {
  const [outcome, setOutcome] = useState<'YES' | 'NO' | null>(null);
  const resolveMutation = useResolveMarket();

  if (!isOpen) return null;

  const handleResolve = async () => {
    if (!outcome) return;
    try {
      if (onResolve) {
        // Controlled mode — parent owns the mutation
        onResolve(outcome);
      } else {
        // Standalone mode — modal owns the mutation
        await resolveMutation.mutateAsync({ marketId: market.id, outcome });
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isPending = resolveMutation.isPending;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-danger/50 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-subtle bg-danger/10 flex items-center justify-between">
          <h2 className="heading-lg text-danger flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Resolve Market
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded hover:bg-danger/20 text-danger transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Market question */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Question</p>
            <p className="text-primary font-medium">{market.question}</p>
          </div>

          {/* Warning banner */}
          <div className="bg-danger/10 border border-danger/20 rounded-md p-4 text-danger text-sm">
            <strong>Irreversible Action Warning:</strong> Resolving a market is permanent.
            This will immediately distribute payouts to the winning outcome and close all positions.
            This action cannot be undone.
          </div>

          {/* Outcome selector */}
          <div>
            <label className="block text-sm font-medium text-primary mb-3">Select Final Outcome</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOutcome('YES')}
                className={`py-3 px-4 rounded-md font-bold transition-all border-2 ${
                  outcome === 'YES'
                    ? 'bg-accent-green text-surface border-accent-green shadow-lg shadow-accent-green/20 scale-[1.02]'
                    : 'bg-surface text-accent-green border-accent-green/40 hover:bg-accent-green/10 hover:border-accent-green/70'
                }`}
              >
                ✓ YES
              </button>
              <button
                type="button"
                onClick={() => setOutcome('NO')}
                className={`py-3 px-4 rounded-md font-bold transition-all border-2 ${
                  outcome === 'NO'
                    ? 'bg-accent-red text-surface border-accent-red shadow-lg shadow-accent-red/20 scale-[1.02]'
                    : 'bg-surface text-accent-red border-accent-red/40 hover:bg-accent-red/10 hover:border-accent-red/70'
                }`}
              >
                ✕ NO
              </button>
            </div>
          </div>

          {/* Selected outcome summary */}
          {outcome && (
            <div className={`rounded-md p-3 text-sm font-medium text-center border ${
              outcome === 'YES'
                ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
                : 'bg-accent-red/10 border-accent-red/30 text-accent-red'
            }`}>
              This market will be resolved as <strong>{outcome}</strong>
            </div>
          )}

          {resolveMutation.error && (
            <div className="text-danger text-sm text-center">
              Failed to resolve market. Please try again.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-subtle bg-base flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-primary hover:text-muted-foreground transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResolve}
            disabled={!outcome || isPending}
            className="px-6 py-2 bg-danger text-surface font-semibold rounded-md hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isPending && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isPending ? 'Resolving...' : 'Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
