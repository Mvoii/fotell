"use client";

import { useState } from 'react';
import { useMarkets } from '@/hooks/useMarkets';
import { MarketsList } from '@/components/markets/MarketsList';
import PageContainer from '@/components/layout/PageContainer';
import { AppShell } from '@/components/layout/AppShell';
import { useNavigation } from '@/hooks/useNavigation';
import { useUser } from '@/hooks/useUser';

export default function MarketsPage() {
  const [status, setStatus] = useState<'OPEN' | 'PENDING' | 'CLOSED' | 'RESOLVED'>('OPEN');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading, isError, refetch } = useMarkets({ status, limit, offset });
  const { activeTab } = useNavigation();
  const { data: user } = useUser();

  return (
    <AppShell
      isAuthenticated={!!user}
      topNavProps={{
        showSearch: true,
      }}
      bottomNavProps={{
        // activeTab: activeTab || undefined,
      }}
    >
      <PageContainer maxWidth="xl" inAppShell>
        <h1 className="text-display-lg font-bold mb-6">Markets</h1>
        {isLoading ? (
          <div className="text-center py-12 text-muted">Loading markets...</div>
        ) : isError ? (
          <div className="text-center py-12 text-error">Failed to load markets. <button onClick={() => refetch()} className="underline">Retry</button></div>
        ) : data ? (
          <MarketsList
            markets={data.markets}
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
