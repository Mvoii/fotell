import { useQuery } from '@tanstack/react-query';
import { marketsService } from '@/lib/api/markets.service';
import type { Market, MarketPrices } from '@/lib/api/types/api';

export function useMarketDetails(id: string) {
  const marketQuery = useQuery<Market, Error>({
    queryKey: ['markets', 'details', id],
    queryFn: async () => {
      const { data } = await marketsService.getById(id);
      return data;
    },
    enabled: !!id,
  });

  const pricesQuery = useQuery<MarketPrices[], Error>({
    queryKey: ['markets', 'prices', id],
    queryFn: async () => {
      const { data } = await marketsService.getPrices(id);
      return data;
    },
    enabled: !!id,
  });

  return {
    market: marketQuery.data,
    prices: pricesQuery.data,
    isLoading: marketQuery.isLoading || pricesQuery.isLoading,
    isError: marketQuery.isError || pricesQuery.isError,
    error: marketQuery.error || pricesQuery.error,
    refetch: () => {
      marketQuery.refetch();
      pricesQuery.refetch();
    },
  };
}
