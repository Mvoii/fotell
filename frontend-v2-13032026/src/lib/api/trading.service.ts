import { apiRequest } from './client';
import type { PlaceTradeRequest, TradeReceipt } from './types/api';

export const tradingService = {
	placeTrade: (marketId: string, data: PlaceTradeRequest) =>
		apiRequest<TradeReceipt>(`/markets/${marketId}/trades`, {
			method: 'POST',
			body: data,
		}),
};
