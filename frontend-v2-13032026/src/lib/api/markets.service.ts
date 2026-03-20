import { apiRequest } from './client';
import type { Market, MarketStatus } from './types/api';

export interface MarketsListResponse {
  markets: Market[];
  total: number;
  limit: number;
  offset: number;
}

export const marketsService = {
  list: (params?: { status?: MarketStatus; limit?: number; offset?: number }) =>
    apiRequest<MarketsListResponse>(`/markets`, { method: 'GET', params }),

  getById: (id: string) =>
    apiRequest<Market>(`/markets/${id}`, { method: 'GET' }),
};
