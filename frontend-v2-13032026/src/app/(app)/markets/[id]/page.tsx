"use client";
import { notFound } from 'next/navigation';
import { useMarketDetails } from '@/hooks/useMarketDetails';
import { MarketDetailsCard } from '@/components/markets/MarketDetailsCard';
import { TradePanel } from '@/components/trade/TradePanel';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';



export default function MarketDetailsPage() {
  const routeParams = useParams();
  const marketId = typeof routeParams.id === 'string' ? routeParams.id : '';
  const { market, prices, isLoading, isError, error, refetch, timeRange, setTimeRange } = useMarketDetails(marketId);

  if (isLoading) {
    return (
      <AppShell>
        <PageContainer maxWidth="xl" inAppShell>
          <div className="text-center py-12 text-muted">Loading market details...</div>
        </PageContainer>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell>
        <PageContainer maxWidth="xl" inAppShell>
          <div className="text-center py-12 text-error">Failed to load market details.<br />{error?.message}<br /><button onClick={refetch} className="underline">Retry</button></div>
        </PageContainer>
      </AppShell>
    );
  }

  if (!market) {
    notFound();
  }

  return (
    <AppShell>
      <PageContainer maxWidth="xl" inAppShell>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketDetailsCard
            market={market}
            prices={Array.isArray(prices) ? prices : prices ? [prices] : []}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          {/* Trading panel only for OPEN markets */}
          {market.status === 'OPEN' && (
            <div className="lg:self-start">
              <TradePanel
                market={market}
                currentPrices={{ yes_price: market.yes_price ?? 0, no_price: market.no_price ?? 0 }}
                userBalance={null} // TODO: wire up user balance
                userPosition={null} // TODO: wire up user position
              />
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
