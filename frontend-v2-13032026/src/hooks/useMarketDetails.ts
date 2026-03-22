import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { marketsService } from '@/lib/api/markets.service';
import type { Market, MarketPrices, TimeRange } from '@/lib/api/types/api';

// Calculate date range based on selected time range
function getTimeRangeDates(range: TimeRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now);

  switch (range) {
    case '1D':
      from.setDate(from.getDate() - 1);
      break;
    case '5D':
      from.setDate(from.getDate() - 5);
      break;
    case '1M':
      from.setMonth(from.getMonth() - 1);
      break;
    case '1Y':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case '5Y':
      from.setFullYear(from.getFullYear() - 5);
      break;
  }

  return { from: from.toISOString(), to };
}

export function useMarketDetails(id: string) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');

  const marketQuery = useQuery<Market, Error>({
    queryKey: ['markets', 'details', id],
    queryFn: async () => {
      const { data } = await marketsService.getById(id);
      return data;
    },
    enabled: !!id,
  });

  const pricesQuery = useQuery<MarketPrices[], Error>({
    queryKey: ['markets', 'prices', id, timeRange],
    queryFn: async () => {
      const dates = getTimeRangeDates(timeRange);
      const { data } = await marketsService.getPrices(id, dates);
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
    timeRange,
    setTimeRange,
  };
}
