import { useQuery } from '@tanstack/react-query';
import { userService } from '@/lib/api/user.service';
import type { UserProfile, BalanceResponse, Position, UserTradesResponse } from '@/lib/api/types/api';
import { queryKeys } from '@/lib/queryKeys';
import { getTokens } from '@/lib/tokenStore';

/**
 * Guards all user-data queries on the presence of an in-memory access token.
 * This prevents unauthenticated visitors from triggering 401 → redirect loops
 * on public pages where these hooks happen to be mounted.
 */

export function useUser(options?: { enabled?: boolean }) {
  const { access_token } = getTokens();
  const enabled = (options?.enabled ?? true) && !!access_token;

  return useQuery<UserProfile, Error, UserProfile>({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      const { data } = await userService.getMe();
      return data;
    },
    enabled,
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useBalance(options?: { enabled?: boolean }) {
  const { access_token } = getTokens();
  const enabled = (options?.enabled ?? true) && !!access_token;

  return useQuery<BalanceResponse, Error, BalanceResponse>({
    queryKey: queryKeys.user.balance(),
    queryFn: async () => {
      const { data } = await userService.getBalance();
      return data;
    },
    enabled,
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function usePositions(options?: { enabled?: boolean }) {
  const { access_token } = getTokens();
  const enabled = (options?.enabled ?? true) && !!access_token;

  return useQuery<Position[], Error, Position[]>({
    queryKey: queryKeys.user.positions(),
    queryFn: async () => {
      const { data } = await userService.getPositions();
      
      const positionsArray: Position[] = Array.isArray(data)
        ? data
        : Array.isArray((data as unknown as { positions?: Position[] })?.positions)
        ? (data as unknown as { positions: Position[] }).positions
        : [];

      // Normalize: Go's shopspring/decimal serializes as JSON strings
      // (e.g. "3589" not 3589). Coerce to numbers so arithmetic works.
      return positionsArray.map((p) => ({
        ...p,
        yes_shares: Number(p.yes_shares),
        no_shares: Number(p.no_shares),
        cost_basis: Number(p.cost_basis),
        realized_pnl: p.realized_pnl != null ? Number(p.realized_pnl) : null,
      }));
    },
    enabled,
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useTrades(limit = 50, offset = 0, options?: { enabled?: boolean }) {
  const { access_token } = getTokens();
  const enabled = (options?.enabled ?? true) && !!access_token;

  return useQuery<UserTradesResponse, Error, UserTradesResponse>({
    queryKey: queryKeys.user.trades({ limit, offset }),
    queryFn: async () => {
      const { data } = await userService.getTrades(limit, offset);
      // Normalize: Go's shopspring/decimal serializes shares as JSON strings
      const trades = (data?.trades ?? []).map((t) => ({
        ...t,
        shares: Number(t.shares),
        cost_paid: Number(t.cost_paid),
      }));
      return { ...data, trades };
    },
    enabled,
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
