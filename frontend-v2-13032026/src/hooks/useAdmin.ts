import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/lib/api/admin.service';
import type { 
  CreateMarketRequest, 
  CreateMarketResponse, 
  AdminMarketActionResponse,
  SettlementStatus,
  AdminUsersResponse,
  AdminUser
} from '@/lib/api/types/admin';
import { queryKeys } from '@/lib/queryKeys';

export function useCreateMarket() {
  const queryClient = useQueryClient();

  return useMutation<CreateMarketResponse, Error, CreateMarketRequest>({
    mutationFn: (data: CreateMarketRequest) => {
      const payload = {
        ...data,
        closes_at: new Date(data.closes_at).toISOString(),
      };
      return adminService.createMarket(payload).then(res => res.data);
    },

    onSuccess: (newMarket) => {
      // Invalidate markets list queries to refresh the data
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.list() });

      // Optionally, you could add the new market to the cache directly
      queryClient.setQueryData(queryKeys.markets.details(newMarket.id), newMarket);
    },

    onError: (error) => {
      console.error('Failed to create market:', error);
    },
  });
}

export function useOpenMarket() {
  const queryClient = useQueryClient();

  return useMutation<AdminMarketActionResponse, Error, string>({
    mutationFn: (marketId: string) =>
      adminService.openMarket(marketId).then(res => res.data),

    onSuccess: (_, marketId) => {
      // Invalidate market detail and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.details(marketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.list() });
    },

    onError: (error) => {
      console.error('Failed to open market:', error);
    },
  });
}

export function useCloseMarket() {
  const queryClient = useQueryClient();

  return useMutation<AdminMarketActionResponse, Error, string>({
    mutationFn: (marketId: string) =>
      adminService.closeMarket(marketId).then(res => res.data),

    onSuccess: (_, marketId) => {
      // Invalidate market detail and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.details(marketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.list() });
    },

    onError: (error) => {
      console.error('Failed to close market:', error);
    },
  });
}

export function useResolveMarket() {
  const queryClient = useQueryClient();

  return useMutation<AdminMarketActionResponse, Error, { marketId: string; outcome: 'YES' | 'NO' }>({
    mutationFn: ({ marketId, outcome }: { marketId: string; outcome: 'YES' | 'NO' }) =>
      adminService.resolveMarket(marketId, outcome).then(res => res.data),

    onSuccess: (_, { marketId }) => {
      // Invalidate market detail and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.details(marketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.list() });
      // Also invalidate user positions and trades since they'll be affected
      queryClient.invalidateQueries({ queryKey: queryKeys.user.positions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.trades() });
    },

    onError: (error) => {
      console.error('Failed to resolve market:', error);
    },
  });
}

export function useSettlementStatus() {
  return useQuery<{ settlements: SettlementStatus[] }, Error>({
    queryKey: queryKeys.admin.settlement(),
    queryFn: () => adminService.getSettlementStatus().then((res) => res.data),
    staleTime: 30000, // 30 seconds
  });
}

export function useAdminUsers(limit: number = 50, offset: number = 0) {
  return useQuery<AdminUsersResponse, Error>({
    queryKey: queryKeys.admin.users({ limit, offset }),
    queryFn: () => adminService.listUsers(limit, offset).then((res) => res.data),
    staleTime: 60000, // 1 minute
  });
}

export function useAdminUser(userId: string) {
  return useQuery<AdminUser, Error>({
    queryKey: queryKeys.admin.user(userId),
    queryFn: () => adminService.getUser(userId).then((res) => res.data),
    enabled: !!userId,
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (userId: string) => adminService.deactivateUser(userId).then(res => res.data),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.user(userId) });
    },
    onError: (error) => {
      console.error('Failed to deactivate user:', error);
    },
  });
}
