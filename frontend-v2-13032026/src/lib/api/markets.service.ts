import { apiRequest } from './client';
import type { Market, MarketStatus, MarketPrices, MarketsListResponse, TimeRangeParams } from './types/api';

// export interface MarketsListResponse {
//   markets: Market[];
//   total: number;
//   limit: number;
//   offset: number;
// }

export const marketsService = {
  list: (params?: { status?: MarketStatus; limit?: number; offset?: number }) =>
    apiRequest<MarketsListResponse>(`/markets`, { method: 'GET', params }),

  getById: (id: string) =>
    apiRequest<Market>(`/markets/${id}`, { method: 'GET' }),
  // Market prices timeline with optional time range
  getPrices: (id: string, params?: TimeRangeParams) =>
    apiRequest<MarketPrices[]>(`/markets/${id}/prices`, {
      method: 'GET',
      params: params
        ? Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined)
          )
        : undefined,
    }),
};
