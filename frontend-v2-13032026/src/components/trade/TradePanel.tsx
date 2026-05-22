import React, { useState } from 'react';
import type { TradePanelProps, PlaceTradeRequest } from '@/lib/api/types/api';
import { MarketOrderForm } from './MarketOrderForm';
import { useTrade } from '@/hooks/useTrade';
import { TradeConfirmModal } from './TradeConfirmModal';
import { toKES } from '@/lib/formatters';

/**
 * TradePanel — Market orders only.
 * Limit orders are not supported by the backend API; the form has been removed.
 */
export function TradePanel({
  market,
  currentPrices,
  userBalance,
  userPosition,
  defaultOutcome = 'YES',
}: TradePanelProps) {
  void defaultOutcome; // TODO: pass to MarketOrderForm once it supports defaultOutcome prop

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingParams, setPendingParams] = useState<PlaceTradeRequest | null>(null);

  const tradeHook = useTrade(market.id);

  const handleMarketOrderSubmit = (params: PlaceTradeRequest) => {
    setPendingParams(params);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmTrade = () => {
    if (pendingParams) {
      tradeHook.placeTrade(pendingParams);
    }
  };

  const handleCloseModal = () => {
    setIsConfirmModalOpen(false);
    // Reset receipt/error when closing
    if (tradeHook.data || tradeHook.error) {
      tradeHook.reset();
    }
  };

  // Calculate estimated cost for the modal (in KES)
  const currentPrice = pendingParams 
    ? (pendingParams.outcome === 'YES' ? currentPrices.yes_price : currentPrices.no_price)
    : 0;
  const estimatedCostKES = pendingParams ? toKES(pendingParams.shares * currentPrice) : 0;

  return (
    <div className="bg-surface border border-subtle rounded-lg p-4 shadow-md w-full">
      <MarketOrderForm
        market={market}
        currentPrices={currentPrices}
        userBalance={userBalance}
        userPosition={userPosition}
        onSubmit={handleMarketOrderSubmit}
        tradeHook={tradeHook}
      />

      <TradeConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseModal}
        market={market}
        tradeParams={pendingParams}
        estimatedCost={estimatedCostKES}
        isPending={tradeHook.isPending}
        error={tradeHook.error}
        receipt={tradeHook.data || null}
        onConfirm={handleConfirmTrade}
      />
    </div>
  );
}