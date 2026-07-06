import { apiRequest } from './client';
import type { 
  CreateMarketRequest, 
  CreateMarketResponse, 
  AdminMarketActionResponse,
  SettlementStatus,
  AdminUsersResponse,
  AdminUser
} from './types/admin';

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

  /**
   * Get current settlement status for all markets (admin only)
   */
  getSettlementStatus: () =>
    apiRequest<{ settlements: SettlementStatus[] }>('/admin/settlement/status', {
      method: 'GET',
    }),

  /**
   * List all users with pagination (admin only)
   */
  listUsers: (limit: number = 50, offset: number = 0) =>
    apiRequest<AdminUsersResponse>('/admin/users', {
      method: 'GET',
      params: { limit, offset },
    }),

  /**
   * Get user details by ID (admin only)
   */
  getUser: (userId: string) =>
    apiRequest<AdminUser>(`/admin/users/${userId}`, {
      method: 'GET',
    }),

  /**
   * Deactivate a user account (admin only)
   */
  deactivateUser: (userId: string) =>
    apiRequest<{ message: string }>(`/admin/users/${userId}/deactivate`, {
      method: 'POST',
    }),
};
