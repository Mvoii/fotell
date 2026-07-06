import type { MarketStatus } from '@/lib/api/types/api';

export const queryKeys = {
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    balance: () => [...queryKeys.user.all, 'balance'] as const,
    positions: () => [...queryKeys.user.all, 'positions'] as const,
    trades: (params?: { limit?: number; offset?: number }) =>
      params ? [...queryKeys.user.all, 'trades', params] as const : [...queryKeys.user.all, 'trades'] as const,
  },

  markets: {
    all: ['markets'] as const,
    list: (params?: { status?: MarketStatus | string; limit?: number; offset?: number }) =>
      params ? [...queryKeys.markets.all, 'list', params] as const : [...queryKeys.markets.all, 'list'] as const,
    details: (id: string) => [...queryKeys.markets.all, 'details', id] as const,
    prices: (id: string, timeRange?: string) =>
      timeRange ? [...queryKeys.markets.all, 'prices', id, timeRange] as const : [...queryKeys.markets.all, 'prices', id] as const,
    position: (id: string) => [...queryKeys.markets.all, 'position', id] as const,
  },

  trades: {
    all: ['trades'] as const,
    byMarket: (marketId: string) => [...queryKeys.trades.all, 'market', marketId] as const,
    byMarketList: (marketId: string, params: { limit?: number; offset?: number }) =>
      [...queryKeys.trades.byMarket(marketId), params] as const,
    byUser: () => [...queryKeys.trades.all, 'user'] as const,
    byUserList: (params: { limit?: number; offset?: number }) =>
      [...queryKeys.trades.byUser(), params] as const,
  },

  comments: {
    all: ['comments'] as const,
    byMarket: (marketId: string) => [...queryKeys.comments.all, 'market', marketId] as const,
    byMarketList: (marketId: string, params: { limit?: number; offset?: number }) =>
      [...queryKeys.comments.byMarket(marketId), params] as const,
    replies: (commentId: string) => [...queryKeys.comments.all, 'replies', commentId] as const,
    repliesList: (commentId: string, params: { limit?: number; offset?: number }) =>
      [...queryKeys.comments.replies(commentId), params] as const,
  },

  admin: {
    all: ['admin'] as const,
    settlement: () => [...queryKeys.admin.all, 'settlement'] as const,
    users: (params?: { limit?: number; offset?: number }) =>
      params ? [...queryKeys.admin.all, 'users', params] as const : [...queryKeys.admin.all, 'users'] as const,
    user: (id: string) => [...queryKeys.admin.all, 'user', id] as const,
  },
};
