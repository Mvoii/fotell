"use client";
import { notFound } from 'next/navigation';
import { useMarketDetails } from '@/hooks/useMarketDetails';
import { MarketDetailsCard } from '@/components/markets/MarketDetailsCard';
import PageContainer from '@/components/layout/PageContainer';

interface MarketDetailsPageProps {
  params: { id: string };
}

import React from 'react';
export default function MarketDetailsPage({ params }: MarketDetailsPageProps) {
  const resolvedParams = React.use(params);
  const { market, prices, isLoading, isError, error, refetch } = useMarketDetails(resolvedParams.id);

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
    <div className="min-h-screen flex items-center justify-center bg-base">
      <div className="max-w-xl w-full">
        <MarketDetailsCard market={market} prices={Array.isArray(prices) ? prices : prices ? [prices] : []} />
      </div>
      {/* TODO: Add TradePanel and other details */}
    </div>
  );
}
