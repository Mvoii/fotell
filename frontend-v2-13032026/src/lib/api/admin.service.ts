import { apiRequest } from './client';
import type { CreateMarketRequest, CreateMarketResponse, AdminMarketActionResponse } from './types/admin';

export const adminService = {
  /**
   * Create a new prediction market (admin only)
   */
  createMarket: (data: CreateMarketRequest) =>
    apiRequest<CreateMarketResponse>('/admin/markets', {
      method: 'POST',
      body: data,
    }),

  /**
   * Open a market for trading (admin only)
   */
  openMarket: (marketId: string) =>
    apiRequest<AdminMarketActionResponse>(`/admin/markets/${marketId}/open`, {
      method: 'POST',
    }),

  /**
   * Close a market (admin only)
   */
  closeMarket: (marketId: string) =>
    apiRequest<AdminMarketActionResponse>(`/admin/markets/${marketId}/close`, {
      method: 'POST',
    }),

  /**
   * Resolve a market with final outcome (admin only)
   */
  resolveMarket: (marketId: string, outcome: 'YES' | 'NO') =>
    apiRequest<AdminMarketActionResponse>(`/admin/markets/${marketId}/resolve`, {
      method: 'POST',
      body: { outcome },
    }),
};
