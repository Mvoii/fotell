import { useQuery } from '@tanstack/react-query';
import { userService } from '@/lib/api/user.service';
import type { UserProfile, BalanceResponse, Position, UserTradesResponse } from '@/lib/api/types/api';
import { queryKeys } from '@/lib/queryKeys';

export function useUser(options?: { enabled?: boolean }) {
  // Default to enabled, let the query handle token validation
  const enabled = options?.enabled ?? true;

  return useQuery<UserProfile, Error, UserProfile>({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      const { data } = await userService.getMe();
      return data;
    },
    enabled,
    retry: (failureCount, error) => {
      // Don't retry if it's an authentication error
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useBalance(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

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
  const enabled = options?.enabled ?? true;

  return useQuery<Position[], Error, Position[]>({
    queryKey: queryKeys.user.positions(),
    queryFn: async () => {
      const { data } = await userService.getPositions();
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

export function useTrades(limit = 50, offset = 0, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  return useQuery<UserTradesResponse, Error, UserTradesResponse>({
    queryKey: queryKeys.user.trades({ limit, offset }),
    queryFn: async () => {
      const { data } = await userService.getTrades(limit, offset);
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
