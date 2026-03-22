import type { PlaceTradeRequest, TradeReceipt, ApiError } from '@/lib/api/types/api';
import { tradingService } from '@/lib/api/trading.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
			await queryClient.cancelQueries({ queryKey: ['user', 'balance'] });
			const previous = queryClient.getQueryData(['user', 'balance']);
			return { previous };
		},
		onSuccess: () => {
			// Invalidate user balance
			queryClient.invalidateQueries({ queryKey: ['user', 'balance'] });
			// Invalidate user position for this market
			queryClient.invalidateQueries({ queryKey: ['markets', 'position', marketId] });
			// Invalidate market details to refresh current prices
			queryClient.invalidateQueries({ queryKey: ['markets', 'details', marketId] });
			// Invalidate price history to include the new trade
			queryClient.invalidateQueries({ queryKey: ['markets', 'prices', marketId] });
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
