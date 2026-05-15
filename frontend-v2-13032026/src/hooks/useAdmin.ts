import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/lib/api/admin.service';
import type { CreateMarketRequest, CreateMarketResponse, AdminMarketActionResponse } from '@/lib/api/types/admin';
import { queryKeys } from '@/lib/queryKeys';

export function useCreateMarket() {
  const queryClient = useQueryClient();

  return useMutation<CreateMarketResponse, Error, CreateMarketRequest>({
    mutationFn: (data: CreateMarketRequest) =>
      adminService.createMarket(data).then(res => res.data),

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
