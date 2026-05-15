import React from 'react';
import type { TradePanelProps, PlaceTradeRequest } from '@/lib/api/types/api';
import { MarketOrderForm } from './MarketOrderForm';
import { useTrade } from '@/hooks/useTrade';

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

  const tradeHook = useTrade(market.id);

  const handleMarketOrderSubmit = (params: PlaceTradeRequest) => {
    tradeHook.placeTrade(params);
  };

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
    </div>
  );
}