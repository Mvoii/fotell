"use client";
import { notFound } from 'next/navigation';
import { useMarketDetails } from '@/hooks/useMarketDetails';
import { MarketDetailsCard } from '@/components/markets/MarketDetailsCard';
import { MarketTradesList } from '@/components/markets/MarketTradesList';
import { CommentsSection } from '@/components/markets/CommentsSection';
import { TradePanel } from '@/components/trade/TradePanel';
import { useParams } from 'next/navigation';
import { useBalance, usePositions, useUser } from '@/hooks/useUser';
import type { Position } from '@/lib/api/types/api';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

  // Normalise: API may return a bare array, a wrapped object, or nothing.
  // This guards against the `positions?.find is not a function` TypeError.
  const positionsArray: Position[] = Array.isArray(positions)
    ? positions
    : Array.isArray((positions as unknown as { positions?: Position[] })?.positions)
    ? (positions as unknown as { positions: Position[] }).positions
    : [];

  const userPosition = positionsArray.find((p) => p.market_id === marketId) ?? null;
  const showTradePanel = market.status === 'OPEN';

  return (
    <AppShell isAuthenticated={!!user}>
      <PageContainer maxWidth="xl" inAppShell>
        <div className="w-full flex flex-col gap-6 pt-2 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`flex flex-col gap-6 ${showTradePanel ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <MarketDetailsCard
                market={market}
                prices={prices}
              />
              <Accordion type="single" collapsible className="rounded-xl border border-subtle bg-surface px-4 shadow-sm">
                <AccordionItem value="trades" className="border-none">
                  <AccordionTrigger className="py-3">Trades</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <MarketTradesList marketId={market.id} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Accordion type="single" collapsible className="rounded-xl border border-subtle bg-surface px-4 shadow-sm">
                <AccordionItem value="comments" className="border-none">
                  <AccordionTrigger className="py-3">Comments</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <CommentsSection marketId={market.id} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Trading panel only for OPEN markets */}
            {showTradePanel && (
              <div className="lg:col-span-1 lg:sticky lg:top-24 h-fit">
                <TradePanel
                  market={market}
                  currentPrices={{ yes_price: market.yes_price ?? 0, no_price: market.no_price ?? 0 }}
                  userBalance={balanceData?.balance_smallest_unit ?? null}
                  userPosition={userPosition}
                />
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
