import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService } from '@/lib/api/trading.service';
import type { PlaceTradeRequest, TradeReceipt, ApiError } from '@/lib/api/types/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * useTrade hook for market trading actions.
 * Exposes mutation state and actions for trading UI components.
 */
export function useTrade(marketId: string) {
	const queryClient = useQueryClient();
	const mutation = useMutation<TradeReceipt, ApiError, PlaceTradeRequest>({
		mutationFn: async (data) => {
			const response = await tradingService.placeTrade(marketId, data);
			return response.data;
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

export function useMarketTrades(marketId: string, limit?: number, offset?: number) {
	return useQuery({
		queryKey: queryKeys.trades.byMarketList(marketId, { limit, offset }),
		queryFn: async () => {
			const { data } = await tradingService.getMarketTrades(marketId, limit, offset);
			return data;
		},
		enabled: !!marketId,
	});
}

export function useUserTrades(limit?: number, offset?: number) {
	return useQuery({
		queryKey: queryKeys.trades.byUserList({ limit, offset }),
		queryFn: async () => {
			const { data } = await tradingService.getUserTrades(limit, offset);
			return data;
		},
	});
}
