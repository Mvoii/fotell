import React from 'react';
import { useMarketDetails } from '@/hooks/useMarketDetails';

export function MarketName({ marketId }: { marketId: string }) {
  const { market, isLoading } = useMarketDetails(marketId);

  if (isLoading) return <span className="animate-pulse bg-elevated h-4 w-32 inline-block rounded"></span>;
  if (!market) return <span>Market #{marketId.substring(0, 8)}</span>;

  return <span>{market.question}</span>;
}
