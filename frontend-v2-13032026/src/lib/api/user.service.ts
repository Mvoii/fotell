import { apiRequest, type ApiRequestOptions } from './client';
import type { UserProfile, BalanceResponse, Position, UserTradesResponse } from './types/api';

export const userService = {
  getMe: (options?: Pick<ApiRequestOptions, 'signal'>) =>
    apiRequest<UserProfile>('/users/me', { method: 'GET', signal: options?.signal }),

  getBalance: (options?: Pick<ApiRequestOptions, 'signal'>) =>
    apiRequest<BalanceResponse>('/users/me/balance', { method: 'GET', signal: options?.signal }),

  getPositions: (options?: Pick<ApiRequestOptions, 'signal'>) =>
    apiRequest<Position[]>('/users/me/positions', { method: 'GET', signal: options?.signal }),

  getTrades: (limit = 50, offset = 0, options?: Pick<ApiRequestOptions, 'signal'>) =>
    apiRequest<UserTradesResponse>('/users/me/trades', { 
      method: 'GET', 
      params: { limit, offset },
      signal: options?.signal 
    }),
};
