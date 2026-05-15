"use client";
import { notFound } from 'next/navigation';
import { useMarketDetails } from '@/hooks/useMarketDetails';
import { MarketDetailsCard } from '@/components/markets/MarketDetailsCard';
import { MarketTradesList } from '@/components/markets/MarketTradesList';
import { TradePanel } from '@/components/trade/TradePanel';
import { useParams } from 'next/navigation';

export default function MarketDetailsPage() {
  const routeParams = useParams();
  const marketId = typeof routeParams.id === 'string' ? routeParams.id : '';
  const { market, prices, isLoading, isError, error, refetch, timeRange, setTimeRange } = useMarketDetails(marketId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-center py-12 text-muted">Loading market details...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-center py-12 text-error">Failed to load market details.<br />{error?.message}<br /><button onClick={refetch} className="underline">Retry</button></div>
      </div>
    );
  }

  if (!market) {
    notFound();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4 py-8">
      <div className="w-full max-w-6xl flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketDetailsCard
            market={market}
            prices={prices as any}
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
        
        {/* Trades List */}
        <div className="w-full">
          <MarketTradesList marketId={market.id} />
        </div>
      </div>
    </div>
  );
}
