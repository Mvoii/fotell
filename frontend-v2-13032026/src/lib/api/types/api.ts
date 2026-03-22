// Trading types
export interface PlaceTradeRequest {
  outcome: 'YES' | 'NO';
  shares: number;
  max_cost?: number; // smallest unit; 0 = disabled
}

export interface TradeReceipt {
  trade_id: string;
  outcome: 'YES' | 'NO';
  shares: number;
  cost_paid: number;
  avg_price: number;
  position: Position;
  balance_after: number;
  timestamp: string;
}
export interface MarketOrderFormProps {
  market: Market;
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;
  userPosition: Position | null;  // use typed Position, not any
  onSubmit: (params: PlaceTradeRequest) => void;  // ← matches API exactly
  tradeHook: ReturnType<typeof import('@/hooks/useTrade').useTrade>;
}
export interface TradePanelProps {
  market: Market;
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;
  userPosition: Position | null;
  defaultTab?: 'market' | 'limit';
  defaultOutcome?: 'YES' | 'NO';
}

export interface Position {
  id: string;
  market_id: string;
  user_id: string;
  yes_shares_smallest_unit: number;
  no_shares_smallest_unit: number;
  total_cost_basis_smallest_unit: number;
  realized_pnl_smallest_unit?: number | null;
}

export interface ApiError {
  error: string;
  details?: {
    error_code?: string;
    field?: string;
    projected_cost?: number;
    max_cost?: number;
  };
}
// Auth interfaces for authentication pages (mirrors backend contract)

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  full_name: string;
}

// ── Markets
export type MarketStatus = 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED';
export type Outcome = 'YES' | 'NO';

export interface Market {
  id: string;
  question: string;
  description?: string;
  status: MarketStatus;
  created_by: string;
  created_at: string;
  closes_at: string;
  updated_at?: string;
  liquidity_param: number;
  yes_price: number | null;
  no_price: number | null;
  resolved_outcome?: Outcome | null;
  resolved_at?: string | null;
  total_volume_smallest_unit?: number;
  total_trades?: number;
}

export interface MarketsListResponse {
  markets: Market[];
  total: number;
  limit: number;
  offset: number;
}

// Market prices timeline
export interface MarketPrices {
  market_id: string;
  yes_price: number;
  no_price: number;
  timestamp: string;
}

// Time range options for price history
export type TimeRange = '1D' | '5D' | '1M' | '1Y' | '5Y';

// Parameters for fetching market prices with time range
export interface TimeRangeParams {
  from?: string; // ISO timestamp
  to?: string;   // ISO timestamp
  range?: TimeRange;
}


export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  created_at: string;
}