import { useQuery } from '@tanstack/react-query';
import { marketsService } from '@/lib/api/markets.service';
import type { Market, MarketPrices } from '@/lib/api/types/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Fetches a single market plus its current price snapshot.
 * The backend `/markets/:id/prices` endpoint returns a single MarketPrices
 * object (no historical time-series). Time-range selection is therefore
 * not supported and has been removed.
 *
 * Price fetch is gated to OPEN markets only: the backend returns 400 for
 * CLOSED/RESOLVED markets, and we don't want that to cascade into a page
 * error when a trader navigates to a settled market.
 *
 * Stale-price mitigation: the backend AMM re-initialises with 50/50 on every
 * server restart (quantities_state not yet restored — market_loader.go:104-115).
 * When the live AMM returns exactly 50/50 but the Market DB record carries
 * different prices, this hook falls back to the DB values and sets
 * `isPriceStale: true` so the UI can optionally warn the user.
 */
export function useMarketDetails(id: string) {
  const marketQuery = useQuery<Market, Error>({
    queryKey: queryKeys.markets.details(id),
    queryFn: async () => {
      const { data } = await marketsService.getById(id);
      return data;
    },
    enabled: !!id,
  });

  const pricesQuery = useQuery<MarketPrices, Error>({
    queryKey: queryKeys.markets.prices(id),
    queryFn: async () => {
      const { data } = await marketsService.getPrices(id);
      return data;
    },
    // Only fetch live AMM prices for OPEN markets — the backend returns 400
    // for CLOSED/RESOLVED markets, which previously caused the whole page to
    // show "Failed to load market details."
    enabled: !!id && marketQuery.data?.status === 'OPEN',
    retry: false,
    refetchInterval: 20000, // periodic state broadcast sync
  });

  // ── Stale-price mitigation ────────────────────────────────────────────
  // If the AMM reset to 50/50 but the DB record has real prices, fall back
  // to the DB values so the UI shows meaningful data with a warning.
  const liveYes = pricesQuery.data?.yes_price;
  const liveNo  = pricesQuery.data?.no_price;
  const dbYes   = marketQuery.data?.yes_price;
  const dbNo    = marketQuery.data?.no_price;

  const ammIsDefaulted =
    liveYes === 50 &&
    liveNo === 50 &&
    dbYes != null &&
    dbNo != null &&
    (dbYes !== 50 || dbNo !== 50);

  const effectivePrices: MarketPrices | undefined = pricesQuery.data
    ? ammIsDefaulted
      ? { ...pricesQuery.data, yes_price: dbYes!, no_price: dbNo! }
      : pricesQuery.data
    : undefined;

  return {
    market: marketQuery.data,
    prices: effectivePrices,
    // isError only reflects the market query — a prices failure is non-fatal
    isLoading:
      marketQuery.isLoading ||
      (marketQuery.data?.status === 'OPEN' && pricesQuery.isLoading),
    isError: marketQuery.isError,
    error: marketQuery.error,
    pricesError: pricesQuery.error,
    // True when the AMM reset to 50/50 and we are showing DB-stored prices
    isPriceStale: ammIsDefaulted,
    refetch: () => {
      marketQuery.refetch();
      pricesQuery.refetch();
    },
  };
}
