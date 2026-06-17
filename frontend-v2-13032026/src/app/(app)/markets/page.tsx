"use client";

import { useState, useMemo } from 'react';
import { useMarkets } from '@/hooks/useMarkets';
import { MarketsList } from '@/components/markets/MarketsList';
import PageContainer from '@/components/layout/PageContainer';
import { AppShell } from '@/components/layout/AppShell';
import { useUser } from '@/hooks/useUser';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { marketsService } from '@/lib/api/markets.service';
import type { MarketPrices } from '@/lib/api/types/api';

export default function MarketsPage() {
  const [status, setStatus] = useState<'OPEN' | 'PENDING' | 'CLOSED' | 'RESOLVED'>('OPEN');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading, isError, refetch } = useMarkets({ status, limit, offset });
  const { data: user } = useUser();

  const pricesQueries = useQueries({
    queries: (data?.markets || []).map((market) => ({
      queryKey: queryKeys.markets.prices(market.id),
      queryFn: async () => {
        const res = await marketsService.getPrices(market.id);
        return { marketId: market.id, prices: res.data };
      },
      staleTime: 1000 * 60, // 1 minute
    })),
  });

  const pricesMap = useMemo(() => {
    const map: Record<string, MarketPrices> = {};
    pricesQueries.forEach((q) => {
      if (q.data) {
        map[q.data.marketId] = q.data.prices;
      }
    });
    return map;
  }, [pricesQueries]);

  return (
    <AppShell
      isAuthenticated={!!user}
      topNavProps={{
        showSearch: true,
      }}
    >
      <PageContainer maxWidth="xl" inAppShell>
        {/* <h1 className="text-display-lg font-bold mb-6">Markets</h1> */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading markets...</div>
        ) : isError ? (
          <div className="text-center py-12 text-error">Failed to load markets. <button onClick={() => refetch()} className="underline">Retry</button></div>
        ) : data ? (
          <MarketsList
            markets={data.markets}
            prices={pricesMap}
            total={data.total}
            limit={data.limit}
            offset={data.offset}
            status={status}
            onPageChange={setOffset}
            onFilterChange={(s: 'OPEN' | 'PENDING' | 'CLOSED' | 'RESOLVED') => { setStatus(s); setOffset(0); }}
          />
        ) : null}
      </PageContainer>
    </AppShell>
  );
}
