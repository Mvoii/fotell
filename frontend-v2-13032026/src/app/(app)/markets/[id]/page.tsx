"use client";
import { notFound } from 'next/navigation';
import { useMarketDetails } from '@/hooks/useMarketDetails';
import { MarketDetailsCard } from '@/components/markets/MarketDetailsCard';
import { MarketTradesList } from '@/components/markets/MarketTradesList';
import { CommentsSection } from '@/components/markets/CommentsSection';
import { TradePanel } from '@/components/trade/TradePanel';
import { useParams } from 'next/navigation';
import { useBalance, usePositions, useUser } from '@/hooks/useUser';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';

export default function MarketDetailsPage() {
  const routeParams = useParams();
  const marketId = typeof routeParams.id === 'string' ? routeParams.id : '';
  const { market, prices, isLoading, isError, error, refetch } = useMarketDetails(marketId);
  const { data: balanceData } = useBalance();
  const { data: positions } = usePositions();
  const { data: user } = useUser();

  if (isLoading) {
    return (
      <AppShell isAuthenticated={!!user}>
        <PageContainer maxWidth="xl" inAppShell>
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-center py-12 text-muted-foreground">Loading market details...</div>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell isAuthenticated={!!user}>
        <PageContainer maxWidth="xl" inAppShell>
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-center py-12 text-error">Failed to load market details.<br />{error?.message}<br /><button onClick={refetch} className="underline">Retry</button></div>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  if (!market) {
    notFound();
  }

  const userPosition = positions?.find((p) => p.market_id === marketId) ?? null;

  return (
    <AppShell isAuthenticated={!!user}>
      <PageContainer maxWidth="xl" inAppShell>
        <div className="w-full flex flex-col gap-6 pt-2 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketDetailsCard
            market={market}
            prices={prices}
          />
          {/* Trading panel only for OPEN markets */}
          {market.status === 'OPEN' && (
            <div className="lg:self-start">
              <TradePanel
                market={market}
                currentPrices={{ yes_price: market.yes_price ?? 0, no_price: market.no_price ?? 0 }}
                userBalance={balanceData?.balance_smallest_unit ?? null}
                userPosition={userPosition}
              />
            </div>
          )}
        </div>

        {/* Trades List and Comments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <div className="flex flex-col gap-6">
            <MarketTradesList marketId={market.id} />
          </div>
          <div className="flex flex-col gap-6">
            <CommentsSection marketId={market.id} />
          </div>
        </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
