import { useQuery } from '@tanstack/react-query';
import { marketsService } from '@/lib/api/markets.service';
import type { MarketStatus, MarketsListResponse } from '@/lib/api/types/api';

export function useMarkets({ status = 'OPEN', limit = 50, offset = 0 }: { status?: MarketStatus; limit?: number; offset?: number } = {}) {
  return useQuery<MarketsListResponse, Error, MarketsListResponse>({
    queryKey: ['markets', 'list', { status, limit, offset }],
    queryFn: async () => {
      const { data } = await marketsService.list({ status, limit, offset });
      return data;
    },
    // TanStack Query v5: keepPreviousData is now enabled by default, remove this property
  });
}
