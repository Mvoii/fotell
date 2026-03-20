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