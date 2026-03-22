import React from 'react';
import type { Market, MarketPrices, TimeRange } from '@/lib/api/types/api';
import { formatPrice } from '@/lib/formatters';
import MarketStatusBadge from '@/components/markets/MarketStatusBadge';
import { PriceChart } from '@/components/charts/PriceChart';
import ProbabilityBar from '@/components/markets/ProbabilityBar';

interface MarketDetailsCardProps {
  market: Market;
  prices: MarketPrices[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

export function MarketDetailsCard({
  market,
  prices,
  timeRange = '1D',
  onTimeRangeChange,
}: MarketDetailsCardProps) {
  // Debug log for prices array
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[MarketDetailsCard] prices:', prices);
  }, [prices]);

  // Debug log for trades and volume
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[MarketDetailsCard] trades:', market.total_trades, 'volume:', market.total_volume_smallest_unit);
  }, [market.total_trades, market.total_volume_smallest_unit]);
  return (
    <div className="bg-surface border border-subtle rounded-lg p-6 shadow-lg w-full">
      <div className="flex items-center gap-2 mb-2">
        <MarketStatusBadge status={market.status} size="md" />
        {market.status === 'RESOLVED' ? (
          <span className="flex items-center text-xs font-bold px-2 py-1 rounded-full border border-primary bg-surface text-primary ml-auto">
            Resolved: {market.resolved_outcome === 'YES' ? 'YES' : market.resolved_outcome === 'NO' ? 'NO' : '--'}
          </span>
        ) : (
          <span className="flex items-center text-xs font-bold px-2 py-1 rounded-full border bg-[rgba(255,152,0,0.15)] text-warning border-[rgba(255,152,0,0.3)] ml-auto">
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="mr-1"><circle cx="7" cy="7" r="6" stroke="#FF9800" strokeWidth="2"/><path d="M7 4v3l2 2" stroke="#FF9800" strokeWidth="2" strokeLinecap="round"/></svg>
            {new Date(market.closes_at).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="text-heading-md font-semibold mb-2 text-primary">{market.question}</div>
      {market.description && (
        <div className="text-primary text-md mb-4">{market.description}</div>
      )}
      <div className="flex flex-col gap-4 mt-4">
        {/* Shared ProbabilityBar with YES/NO percentages and bar */}
        <ProbabilityBar yesPrice={market.yes_price} noPrice={market.no_price} />
        {/* Outcome Pills */}
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center px-4 py-2 rounded-md bg-yes-dim border border-[rgba(0,200,83,0.35)] text-yes-strong font-mono font-bold text-lg gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3v12M9 3l-4 4M9 3l4 4" stroke="#00c853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Yes {typeof market.yes_price === 'number' ? formatPrice(market.yes_price, 'percent') : '--'}
          </span>
          <span className="inline-flex items-center px-4 py-2 rounded-md bg-no-dim border border-[rgba(255,23,68,0.35)] text-no-strong font-mono font-bold text-lg gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 15V3M9 15l-4-4M9 15l4-4" stroke="#ff1744" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            No {typeof market.no_price === 'number' ? formatPrice(market.no_price, 'percent') : '--'}
          </span>
        </div>
      </div>
      <div className="flex items-center mt-4">
        <span className="text-body-sm text-primary font-mono">VOLUME</span>
        <span className="ml-3 text-body-sm text-primary font-mono">{market.liquidity_param ? market.liquidity_param : '--'}</span>
      </div>
      {/* Price Chart integration */}
      <div className="mt-6">
        {prices && prices.length > 0 ? (
          <PriceChart
            prices={prices}
            height={250}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
          />
        ) : (
          <div className="text-muted text-sm">Price chart coming soon...</div>
        )}
      </div>
    </div>
  );
}
