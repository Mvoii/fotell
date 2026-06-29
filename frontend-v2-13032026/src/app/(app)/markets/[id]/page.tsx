"use client";
import { notFound } from 'next/navigation';
import { useMarketDetails } from '@/hooks/useMarketDetails';
import { MarketDetailsCard } from '@/components/markets/MarketDetailsCard';
import { MarketTradesList } from '@/components/markets/MarketTradesList';
import { CommentsSection } from '@/components/markets/CommentsSection';
import { TradePanel } from '@/components/trade/TradePanel';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useBalance, usePositions, useUser } from '@/hooks/useUser';
import { useMarketTrades } from '@/hooks/useTrade';
import type { Position } from '@/lib/api/types/api';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function MarketDetailsPage() {
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const marketId = typeof routeParams.id === 'string' ? routeParams.id : '';
  const { market, prices, isLoading, isError, error, refetch } = useMarketDetails(marketId);

  // Read ?outcome=YES|NO from query string (set by BUY YES/NO buttons on MarketsList)
  const outcomeParam = searchParams.get('outcome');
  const defaultOutcome: 'YES' | 'NO' | undefined =
    outcomeParam === 'YES' || outcomeParam === 'NO' ? outcomeParam : undefined;

  // Auto-scroll to trade panel when arriving via ?outcome query param
  useEffect(() => {
    if (!defaultOutcome) return;
    const panel = document.getElementById('trade-panel');
    if (panel) {
      const rect = panel.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const targetScrollY = rect.top + scrollTop;
      const currentScrollY = scrollTop;
      
      // Reduce the scroll amount by 30% (scrolling 70% of the distance)
      const distance = targetScrollY - currentScrollY;
      const reducedDistance = distance * 0.7;
      const finalScrollY = currentScrollY + reducedDistance;

      window.scrollTo({
        top: finalScrollY,
        behavior: 'smooth',
      });
    }
  }, [defaultOutcome]);
  const { data: balanceData } = useBalance();
  const { data: positions } = usePositions();
  const { data: user } = useUser();
  const { data: tradesData } = useMarketTrades(marketId);

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
  const isResolved = market.status === 'RESOLVED';
  const isClosed   = market.status === 'CLOSED';

  return (
    <AppShell isAuthenticated={!!user}>
      <PageContainer 
        maxWidth="xl" 
        inAppShell 
        showBreadcrumbs={true}
        breadcrumbLabels={{ [marketId]: "Details" }}
      >
        <div className="w-full flex flex-col gap-6 pt-2 pb-8">

          {/* ── RESOLVED / CLOSED SETTLEMENT BANNER ──────────────────────────── */}
          {(isResolved || isClosed) && (
            <div
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-sm ${
                isResolved && market.resolved_outcome === 'YES'
                  ? 'bg-yes-dim border-[rgba(0,200,83,0.3)]'
                  : isResolved && market.resolved_outcome === 'NO'
                  ? 'bg-no-dim border-[rgba(255,23,68,0.25)]'
                  : 'bg-surface border-subtle'
              }`}
              role="status"
              aria-label="Market settlement status"
            >
              {/* Icon */}
              <span
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full ${
                  isResolved && market.resolved_outcome === 'YES'
                    ? 'bg-[rgba(0,200,83,0.15)] text-yes-strong'
                    : isResolved && market.resolved_outcome === 'NO'
                    ? 'bg-[rgba(255,23,68,0.1)] text-no-strong'
                    : 'bg-[rgba(139,146,165,0.12)] text-muted-foreground'
                }`}
              >
                {isResolved ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M6 10.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M10 6v4.5l3 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                )}
              </span>

              {/* Text */}
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-semibold text-primary">
                  {isResolved
                    ? `Market resolved — ${market.resolved_outcome ?? 'outcome pending'}`
                    : 'Market closed — awaiting resolution'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isResolved
                    ? 'Payouts are being processed for winning positions.'
                    : 'Trading has ended. The outcome will be announced shortly.'}
                </span>
              </div>

              {/* Outcome pill (resolved only) */}
              {isResolved && market.resolved_outcome && (
                <span
                  className={`flex-shrink-0 text-sm font-extrabold font-mono px-3 py-1 rounded-full border ${
                    market.resolved_outcome === 'YES'
                      ? 'text-yes-strong border-[rgba(0,200,83,0.4)] bg-yes-dim'
                      : 'text-no-strong border-[rgba(255,23,68,0.3)] bg-no-dim'
                  }`}
                >
                  {market.resolved_outcome}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`flex flex-col gap-6 ${showTradePanel ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <MarketDetailsCard
                market={market}
                prices={prices}
                tradesTotal={tradesData?.total}
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
              <div id="trade-panel" className="lg:col-span-1 lg:sticky lg:top-24 h-fit">
                <TradePanel
                  market={market}
                  currentPrices={{ yes_price: market.yes_price ?? 0, no_price: market.no_price ?? 0 }}
                  userBalance={balanceData?.balance_smallest_unit ?? null}
                  userPosition={userPosition}
                  defaultOutcome={defaultOutcome}
                />
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
