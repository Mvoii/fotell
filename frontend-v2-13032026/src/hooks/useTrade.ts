import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService } from '@/lib/api/trading.service';
import type { PlaceTradeRequest, TradeReceipt, ApiError, Trade, PlaceSellRequest, SellReceipt, SellQuoteResponse } from '@/lib/api/types/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Normalize a trade object: coerce decimal.Decimal string fields to numbers.
 * Go's shopspring/decimal serializes as JSON strings (e.g. "10" not 10).
 */
function normalizeTrade<T extends Partial<Trade>>(t: T): T {
	return {
		...t,
		...(t.shares != null && { shares: Number(t.shares) }),
		...(t.cost_paid != null && { cost_paid: Number(t.cost_paid) }),
	};
}

/**
 * useTrade hook for market trading actions.
 * Exposes mutation state and actions for trading UI components.
 */
export function useTrade(marketId: string) {
	const queryClient = useQueryClient();
	const mutation = useMutation<TradeReceipt, ApiError, PlaceTradeRequest>({
		mutationFn: async (data) => {
			const response = await tradingService.placeTrade(marketId, data);
			const receipt = response.data;
			const tradeData = (receipt as any).trade || {};
			// Normalize decimal.Decimal strings in receipt
			return {
				...receipt,
				trade_id: tradeData.trade_id || (receipt as any).trade_id,
				outcome: tradeData.outcome || (receipt as any).outcome,
				shares: Number(tradeData.shares ?? (receipt as any).shares ?? 0),
				cost_paid: Number(tradeData.financials?.amount_cents ?? (receipt as any).cost_paid ?? 0),
				avg_price: Number((receipt as any).avg_price),
				balance_after: Number((receipt as any).balance_after),
				timestamp: tradeData.timestamp || (receipt as any).timestamp || new Date().toISOString(),
				position: (receipt as any).position ? {
					...(receipt as any).position,
					yes_shares: Number((receipt as any).position.yes_shares),
					no_shares: Number((receipt as any).position.no_shares),
					cost_basis: Number((receipt as any).position.cost_basis),
				} : (receipt as any).position,
			};
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: queryKeys.user.balance() });
			const previous = queryClient.getQueryData(queryKeys.user.balance());
			return { previous };
		},
		onSuccess: () => {
			// Invalidate user balance
			queryClient.invalidateQueries({ queryKey: queryKeys.user.balance() });
			// Invalidate user position for this market
			queryClient.invalidateQueries({ queryKey: queryKeys.markets.position(marketId) });
			// Invalidate market details to refresh current prices
			queryClient.invalidateQueries({ queryKey: queryKeys.markets.details(marketId) });
			// Invalidate price history to include the new trade
			queryClient.invalidateQueries({ queryKey: queryKeys.markets.prices(marketId) });
			// Invalidate trades list for the market and user
			queryClient.invalidateQueries({ queryKey: queryKeys.trades.byMarket(marketId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.trades.byUser() });
		},
		onError: () => {
			// Optionally handle error globally
		},
	});

	return {
		...mutation,
		placeTrade: mutation.mutate,
		placeTradeAsync: mutation.mutateAsync,
	};
}

export function useSell(marketId: string) {
	const queryClient = useQueryClient();
	const mutation = useMutation<SellReceipt, ApiError, PlaceSellRequest>({
		mutationFn: async (data) => {
			const response = await tradingService.placeSellOrder(marketId, data);
			const receipt = response.data;
			const tradeData = (receipt as any).trade || {};
			return {
				...receipt,
				trade_id: tradeData.trade_id || (receipt as any).trade_id,
				outcome: tradeData.outcome || (receipt as any).outcome,
				shares: Number(tradeData.shares ?? (receipt as any).shares ?? 0),
				proceeds_paid: Number(tradeData.financials?.amount_cents ?? (receipt as any).proceeds_paid ?? 0),
				avg_price: Number((receipt as any).avg_price),
				balance_after: Number((receipt as any).balance_after),
				timestamp: tradeData.timestamp || (receipt as any).timestamp || new Date().toISOString(),
				position: (receipt as any).position ? {
					...(receipt as any).position,
					yes_shares: Number((receipt as any).position.yes_shares),
					no_shares: Number((receipt as any).position.no_shares),
					cost_basis: Number((receipt as any).position.cost_basis),
				} : (receipt as any).position,
			};
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: queryKeys.user.balance() });
			const previous = queryClient.getQueryData(queryKeys.user.balance());
			return { previous };
		},
		onSuccess: () => {
			// Invalidate queries to refresh data
			queryClient.invalidateQueries({ queryKey: queryKeys.user.balance() });
			queryClient.invalidateQueries({ queryKey: queryKeys.markets.position(marketId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.markets.details(marketId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.markets.prices(marketId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.trades.byMarket(marketId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.trades.byUser() });
		},
	});

	return {
		...mutation,
		placeSell: mutation.mutate,
		placeSellAsync: mutation.mutateAsync,
	};
}



export function useMarketTrades(marketId: string, limit?: number, offset?: number) {
	return useQuery({
		queryKey: queryKeys.trades.byMarketList(marketId, { limit, offset }),
		queryFn: async () => {
			const { data } = await tradingService.getMarketTrades(marketId, limit, offset);
			return {
				...data,
				trades: (data?.trades ?? []).map(normalizeTrade),
			};
		},
		enabled: !!marketId,
	});
}

export function useUserTrades(limit?: number, offset?: number) {
	return useQuery({
		queryKey: queryKeys.trades.byUserList({ limit, offset }),
		queryFn: async () => {
			const { data } = await tradingService.getUserTrades(limit, offset);
			return {
				...data,
				trades: (data?.trades ?? []).map(normalizeTrade),
			};
		},
	});
}
