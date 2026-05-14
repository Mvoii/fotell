import React from 'react';
import type { TradePanelProps, PlaceTradeRequest } from '@/lib/api/types/api';
import { MarketOrderForm } from './MarketOrderForm';
import { LimitOrderForm } from './LimitOrderForm';
import { useTrade } from '@/hooks/useTrade';

export function TradePanel({
  market,
  currentPrices,
  userBalance,
  userPosition,
  defaultOutcome = 'YES',
}: TradePanelProps) {
  void defaultOutcome; // TODO: pass to MarketOrderForm once it supports defaultOutcome prop

  const tradeHook = useTrade(market.id);
  const [orderType, setOrderType] = React.useState<'market' | 'limit'>('market');

  const handleMarketOrderSubmit = (params: PlaceTradeRequest) => {
    tradeHook.placeTrade(params);
  };

  const handleLimitOrderSubmit = (params: {
    marketId: string;
    outcome: 'YES' | 'NO';
    shares: number;
    triggerPrice: number;
    expiry: '1h' | '24h' | '7d' | 'GTC';
  }) => {
    // Limit orders use the same endpoint with max_cost set to triggerPrice
    tradeHook.placeTrade({
      outcome: params.outcome,
      shares: params.shares,
    } as PlaceTradeRequest);
  };

  return (
    <div className="bg-surface border border-subtle rounded-lg p-4 shadow-md w-full">
      {/* ── Tab toggle */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded ${orderType === 'market' ? 'bg-primary text-white' : 'bg-subtle text-primary'}`}
          onClick={() => setOrderType('market')}
        >
          Market Order
        </button>
        <button
          className={`px-3 py-1 rounded ${orderType === 'limit' ? 'bg-primary text-white' : 'bg-subtle text-primary'}`}
          onClick={() => setOrderType('limit')}
        >
          Limit Order
        </button>
      </div>

      {/* ── Active form */}
      {orderType === 'market' ? (
        <MarketOrderForm
          market={market}
          currentPrices={currentPrices}
          userBalance={userBalance}
          userPosition={userPosition}
          onSubmit={handleMarketOrderSubmit}
          tradeHook={tradeHook}
        />
      ) : (
        <LimitOrderForm
          market={market}
          currentPrices={currentPrices}
          userBalance={userBalance}
          userPosition={userPosition}
          onSubmit={handleLimitOrderSubmit}
          tradeHook={tradeHook}
        />
      )}
    </div>
  );
}