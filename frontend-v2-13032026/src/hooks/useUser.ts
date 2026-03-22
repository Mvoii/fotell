import { useQuery } from '@tanstack/react-query';
import { getTokens } from '@/lib/auth';
import { userService } from '@/lib/api/user.service';
import type { UserProfile, BalanceResponse, Position, UserTradesResponse } from '@/lib/api/types/api';

export function useUser(options?: { enabled?: boolean }) {
  const hasToken =
    typeof window !== 'undefined' && !!getTokens().access_token;
  const enabled = options?.enabled ?? hasToken;

  return useQuery<UserProfile, Error, UserProfile>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await userService.getMe();
      return data;
    },
    enabled,
  });
}

export function useBalance(options?: { enabled?: boolean }) {
  const hasToken =
    typeof window !== 'undefined' && !!getTokens().access_token;
  const enabled = options?.enabled ?? hasToken;

  return useQuery<BalanceResponse, Error, BalanceResponse>({
    queryKey: ['user', 'balance'],
    queryFn: async () => {
      const { data } = await userService.getBalance();
      return data;
    },
    enabled,
  });
}

export function usePositions(options?: { enabled?: boolean }) {
  const hasToken =
    typeof window !== 'undefined' && !!getTokens().access_token;
  const enabled = options?.enabled ?? hasToken;

  return useQuery<Position[], Error, Position[]>({
    queryKey: ['user', 'positions'],
    queryFn: async () => {
      const { data } = await userService.getPositions();
      return data;
    },
    enabled,
  });
}

export function useTrades(limit = 50, offset = 0, options?: { enabled?: boolean }) {
  const hasToken =
    typeof window !== 'undefined' && !!getTokens().access_token;
  const enabled = options?.enabled ?? hasToken;

  return useQuery<UserTradesResponse, Error, UserTradesResponse>({
    queryKey: ['user', 'trades', { limit, offset }],
    queryFn: async () => {
      const { data } = await userService.getTrades(limit, offset);
      return data;
    },
    enabled,
  });
}
