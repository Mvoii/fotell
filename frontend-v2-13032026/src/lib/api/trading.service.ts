import { apiRequest } from './client';
import type { PlaceTradeRequest, TradeReceipt, MarketTradesResponse, UserTradesResponse } from './types/api';

export const tradingService = {
	placeTrade: (marketId: string, data: PlaceTradeRequest) =>
		apiRequest<TradeReceipt>(`/markets/${marketId}/trades`, {
			method: 'POST',
			body: data,
		}),

	getMarketTrades: (marketId: string, limit: number = 50, offset: number = 0) => {
		const searchParams = new URLSearchParams();
		if (limit) searchParams.append('limit', limit.toString());
		if (offset) searchParams.append('offset', offset.toString());
		const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
		return apiRequest<MarketTradesResponse>(`/markets/${marketId}/trades${qs}`, {
			method: 'GET',
		});
	},

	getUserTrades: (limit: number = 50, offset: number = 0) => {
		const searchParams = new URLSearchParams();
		if (limit) searchParams.append('limit', limit.toString());
		if (offset) searchParams.append('offset', offset.toString());
		const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
		return apiRequest<UserTradesResponse>(`/users/me/trades${qs}`, {
			method: 'GET',
		});
	},
};
