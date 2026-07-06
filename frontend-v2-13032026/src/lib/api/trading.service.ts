import { apiRequest } from './client';
import type {
  PlaceTradeRequest,
  TradeReceipt,
  MarketTradesResponse,
  UserTradesResponse,
  BuyQuoteResponse,
  SellQuoteResponse,
  PlaceSellRequest,
  SellReceipt,
} from './types/api';

export const tradingService = {
  // ── Buy ─────────────────────────────────────────────────────────────────

  /**
   * Fetches a projected cost quote for buying shares WITHOUT executing the trade.
   *
   * Endpoint: GET /api/v1/markets/{marketId}/quote?outcome=YES&shares=10.5
   */
  getBuyQuote: (marketId: string, outcome: 'YES' | 'NO', shares: number) =>
    apiRequest<BuyQuoteResponse>(`/markets/${marketId}/quote`, {
      method: 'GET',
      params: { outcome, shares },
    }),

  /**
   * Executes a market buy order.
   *
   * Endpoint: POST /api/v1/markets/{marketId}/trades
   */
  placeTrade: (marketId: string, data: PlaceTradeRequest) =>
    apiRequest<TradeReceipt>(`/markets/${marketId}/trades`, {
      method: 'POST',
      body: { action: 'BUY', ...data },
    }),

  // ── Sell ─────────────────────────────────────────────────────────────────

  /**
   * Executes a market sell order, liquidating shares back into KES.
   *
   * Endpoint: POST /api/v1/markets/{marketId}/trades
   */
  placeSellOrder: (marketId: string, data: PlaceSellRequest) =>
    apiRequest<SellReceipt>(`/markets/${marketId}/trades`, {
      method: 'POST',
      body: { action: 'SELL', ...data },
    }),

  // ── Trade history ────────────────────────────────────────────────────────

  getMarketTrades: (marketId: string, limit: number = 50, offset: number = 0) => {
    const searchParams = new URLSearchParams();
    if (limit)  searchParams.append('limit',  limit.toString());
    if (offset) searchParams.append('offset', offset.toString());
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<MarketTradesResponse>(`/markets/${marketId}/trades${qs}`, {
      method: 'GET',
    });
  },

  getUserTrades: (limit: number = 50, offset: number = 0) => {
    const searchParams = new URLSearchParams();
    if (limit)  searchParams.append('limit',  limit.toString());
    if (offset) searchParams.append('offset', offset.toString());
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<UserTradesResponse>(`/users/me/trades${qs}`, {
      method: 'GET',
    });
  },
};

