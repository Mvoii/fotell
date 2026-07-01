import React, { useState } from 'react';
import type { TradePanelProps, PlaceTradeRequest, PlaceSellRequest } from '@/lib/api/types/api';
import { MarketOrderForm } from './MarketOrderForm';
import { useTrade, useSell } from '@/hooks/useTrade';
import { TradeConfirmModal } from './TradeConfirmModal';
import { estimateCostKES } from '@/lib/formatters';

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
  void defaultOutcome; // passed through to MarketOrderForm

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [pendingBuyParams, setPendingBuyParams] = useState<PlaceTradeRequest | null>(null);
  const [pendingSellParams, setPendingSellParams] = useState<PlaceSellRequest | null>(null);

  const tradeHook = useTrade(market.id);
  const sellHook = useSell(market.id);

  const handleMarketOrderSubmit = (params: PlaceTradeRequest) => {
    setPendingBuyParams(params);
    setTradeType('BUY');
    setIsConfirmModalOpen(true);
  };

  const handleSellSubmit = (params: PlaceSellRequest) => {
    setPendingSellParams(params);
    setTradeType('SELL');
    setIsConfirmModalOpen(true);
  };

  const handleConfirmTrade = () => {
    if (tradeType === 'BUY' && pendingBuyParams) {
      tradeHook.placeTrade(pendingBuyParams);
    } else if (tradeType === 'SELL' && pendingSellParams) {
      sellHook.placeSell(pendingSellParams);
    }
  };

  const handleCloseModal = () => {
    setIsConfirmModalOpen(false);
    // Reset receipt/error when closing
    if (tradeHook.data || tradeHook.error) tradeHook.reset();
    if (sellHook.data || sellHook.error) sellHook.reset();
  };

  const isSell = tradeType === 'SELL';

  // Calculate estimated cost for the modal (in KES)
  const currentPrice = tradeType === 'BUY' && pendingBuyParams
    ? (pendingBuyParams.outcome === 'YES' ? currentPrices.yes_price : currentPrices.no_price)
    : 0;
  const estimatedAmount = isSell
    ? 0 // Proceeds calculated at execution
    : (pendingBuyParams ? estimateCostKES(pendingBuyParams.shares, currentPrice) : 0);

  return (
    <div className="bg-surface border border-subtle rounded-lg p-4 shadow-md w-full">
      <MarketOrderForm
        market={market}
        currentPrices={currentPrices}
        userBalance={userBalance}
        userPosition={userPosition}
        onSubmit={handleMarketOrderSubmit}
        onSellSubmit={handleSellSubmit}
        tradeHook={tradeHook}
        sellHook={sellHook}
        defaultOutcome={defaultOutcome}
      />

      <TradeConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseModal}
        market={market}
        currentPrices={currentPrices}
        tradeType={tradeType}
        tradeParams={isSell ? pendingSellParams : pendingBuyParams}
        estimatedAmount={estimatedAmount}
        isPending={isSell ? sellHook.isPending : tradeHook.isPending}
        error={isSell ? sellHook.error : tradeHook.error}
        receipt={(isSell ? sellHook.data : tradeHook.data) || null}
        onConfirm={handleConfirmTrade}
      />
    </div>
  );
}