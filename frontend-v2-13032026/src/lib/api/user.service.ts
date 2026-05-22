import { apiRequest, ApiRequestError, type ApiRequestOptions, type ApiResponse } from './client';
import { MOCK_USER_POSITIONS, MOCK_USER_TRADES } from '@/lib/mock/userFallbacks';
import type { UserProfile, BalanceResponse, Position, UserTradesResponse } from './types/api';

function isNotImplemented(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError && err.status === 501;
}

async function withNotImplementedFallback<T>(
  request: () => Promise<ApiResponse<T>>,
  fallback: T,
): Promise<ApiResponse<T>> {
  try {
    return await request();
  } catch (err) {
    if (isNotImplemented(err)) {
      return { data: fallback, status: 200 };
    }
    throw err;
  }
}

export const userService = {
  getMe: (options?: Pick<ApiRequestOptions, 'signal'>) =>
    apiRequest<UserProfile>('/users/me', { method: 'GET', signal: options?.signal }),

  getBalance: (options?: Pick<ApiRequestOptions, 'signal'>) =>
    apiRequest<BalanceResponse>('/users/me/balance', { method: 'GET', signal: options?.signal }),

  getPositions: (options?: Pick<ApiRequestOptions, 'signal'>) =>
    withNotImplementedFallback(
      () =>
        apiRequest<Position[]>('/users/me/positions', {
          method: 'GET',
          signal: options?.signal,
        }),
      MOCK_USER_POSITIONS,
    ),

  getTrades: (limit = 50, offset = 0, options?: Pick<ApiRequestOptions, 'signal'>) =>
    withNotImplementedFallback(
      () =>
        apiRequest<UserTradesResponse>('/users/me/trades', {
          method: 'GET',
          params: { limit, offset },
          signal: options?.signal,
        }),
      MOCK_USER_TRADES,
    ),
};
