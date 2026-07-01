import React from 'react';
import type { Market, PlaceTradeRequest, PlaceSellRequest, TradeReceipt, SellReceipt, ApiError } from '@/lib/api/types/api';
import { formatKES, formatPrice } from '@/lib/formatters';
import { TradeReceiptCard } from './TradeReceiptCard';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface TradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market;
  /** Live prices from the market details query — used instead of market.yes_price / no_price which can be stale. */
  currentPrices: { yes_price: number; no_price: number };
  tradeType?: 'BUY' | 'SELL';
  tradeParams: PlaceTradeRequest | PlaceSellRequest | null;
  estimatedAmount: number; // in KES (cost for buy, proceeds for sell)
  isPending: boolean;
  error: ApiError | null;
  receipt: TradeReceipt | SellReceipt | null;
  onConfirm: () => void;
}

export function TradeConfirmModal({
  isOpen,
  onClose,
  market,
  currentPrices,
  tradeType = 'BUY',
  tradeParams,
  estimatedAmount,
  isPending,
  error,
  receipt,
  onConfirm,
}: TradeConfirmModalProps) {
  if (!isOpen) return null;

  // If we have a receipt, show the receipt card instead of the confirmation UI
  if (receipt) {
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm">
            <TradeReceiptCard receipt={receipt} onClose={onClose} />
          </div>
        </div>
      </ModalPortal>
    );
  }

  if (!tradeParams) return null;

  const { outcome, shares } = tradeParams;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-subtle rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 border-b border-subtle flex items-center justify-between">
          <h2 className="heading-lg text-primary">{tradeType === 'SELL' ? 'Confirm Sell' : 'Confirm Trade'}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-primary transition-colors"
            disabled={isPending}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Market</p>
            <p className="text-primary font-medium line-clamp-2">{market.question}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-y border-subtle border-dashed">
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Side</p>
              <div className="flex items-center gap-2">
                {tradeType === 'SELL' ? (
                  <span className="font-bold text-lg text-accent-blue">SELL</span>
                ) : (
                  <div className={`w-3 h-3 rounded-full ${outcome === 'YES' ? 'bg-yes-strong' : 'bg-no-strong'}`} />
                )}
                <span className={`font-bold text-lg ${outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'}`}>
                  {outcome}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Shares</p>
              <p className="text-primary font-bold text-lg font-mono">{shares}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-primary">Current Price</span>
              <span className="text-primary font-mono font-semibold">
                {outcome === 'YES'
                  ? formatPrice(currentPrices.yes_price)
                  : formatPrice(currentPrices.no_price)}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-primary">{tradeType === 'SELL' ? 'Total Est. Proceeds' : 'Total Est. Cost'}</span>
              <span className={tradeType === 'SELL' ? 'text-accent-blue' : 'text-primary'}>{formatKES(estimatedAmount)}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-no-dim border border-no-strong/20 rounded text-no-strong text-sm font-medium">
              {error.error}
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-subtle p-3 rounded italic">
            Note: Your final price may vary slightly due to market slippage during execution.
          </div>
        </div>

        <div className="p-4 border-t border-subtle bg-base flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              tradeType === 'SELL' ? 'Confirm Sell' : 'Confirm Purchase'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-full py-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
