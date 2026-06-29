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
      body: data,
    }),

  // ── Sell (Sprint 2 — backend endpoints pending) ──────────────────────────

  /**
   * Fetches a projected proceeds quote for selling shares WITHOUT executing.
   *
   * Endpoint: GET /api/v1/markets/{marketId}/sell-quote?outcome=YES&shares=10.5
   *
   * NOTE: The backend route has not yet been implemented. This method will throw
   * an ApiRequestError with status 404 until the backend ships the route.
   * Call sites should handle the error gracefully (e.g. disable the sell button
   * and show a "Sell not yet available" notice).
   */
  getSellQuote: (marketId: string, outcome: 'YES' | 'NO', shares: number) =>
    apiRequest<SellQuoteResponse>(`/markets/${marketId}/sell-quote`, {
      method: 'GET',
      params: { outcome, shares },
    }),

  /**
   * Executes a market sell order, liquidating shares back into KES.
   *
   * Endpoint: POST /api/v1/markets/{marketId}/sell
   *
   * NOTE: The backend route has not yet been implemented. This method will throw
   * an ApiRequestError with status 404/501 until the backend ships the route.
   */
  placeSellOrder: (marketId: string, data: PlaceSellRequest) =>
    apiRequest<SellReceipt>(`/markets/${marketId}/sell`, {
      method: 'POST',
      body: data,
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

