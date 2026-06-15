// ── Auth ────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  full_name: string;
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

/** Full current user from GET /users/me (superset of fields in UserInfo). */
export interface UserProfile {
  id: string;
  email: string;
  email_verified: boolean;
  full_name: string;
  username: string;
  role: 'USER' | 'ADMIN';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

// ── Markets ─────────────────────────────────────────────────────────────

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
  // NOTE: total_volume and total_trades do NOT exist in the API
}

export interface MarketsListResponse {
  markets: Market[];
  total: number;
  limit: number;
  offset: number;
}

// Market prices snapshot
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

// ── Trading ─────────────────────────────────────────────────────────────

export interface PlaceTradeRequest {
  outcome: 'YES' | 'NO';
  shares: number;
  // NOTE: max_cost does NOT exist in the API
}

export interface TradeReceipt {
  trade_id: string;
  outcome: 'YES' | 'NO';
  shares: number;
  cost_paid: number;      // cents (int64 from API) — actual LSMR marginal cost
  avg_price: number;      // cents per share (= cost_paid / shares)
  position: Position;
  balance_after: number;  // cents (int64 from API)
  timestamp: string;
}

export interface Position {
  // NOTE: no top-level `id` field in the API
  user_id: string;
  market_id: string;
  yes_shares: number;    // double
  no_shares: number;     // double
  cost_basis: number;    // cents
  realized_pnl: number | null;  // cents | null
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  market_id: string;
  outcome: 'YES' | 'NO';
  shares: number;
  cost_paid: number;     // cents
  created_at: string;
}

export interface PositionWithMarket extends Position {
  market?: Market;
}

// ── User ───────────────────────────────────────────────────────────────

export interface BalanceResponse {
  balance_smallest_unit: number;  // cents
  balance_kes: number;
}

export interface UserTradesResponse {
  trades: Trade[];
  total: number;
}

export interface MarketTradesResponse {
  trades: Trade[];
  total: number;
}

// NOTE: PortfolioSummary and DashboardStats have been intentionally removed.
// These composite types have no corresponding backend endpoints.
// Derive equivalent stats client-side from Position[] and UserTradesResponse.

// ── Comments ────────────────────────────────────────────────────────────

export type VoteType = 'UPVOTE' | 'DOWNVOTE' | 'NONE';

export interface Comment {
  id: string;
  market_id: string;
  user_id: string;
  username: string;
  parent_id: string | null;
  content: string;
  is_deleted: boolean;
  vote_count: number;
  current_user_vote: VoteType;
  created_at: string;
  updated_at: string;
}

export interface CommentsListResponse {
  comments: Comment[];
  total: number;
}

export interface CreateCommentRequest {
  content: string;
}

export interface VoteRequest {
  vote_type: 'UPVOTE' | 'DOWNVOTE';
}

// ── API Error ───────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: {
    error_code?: string;
    field?: string;
    projected_cost?: number;
  };
}

// ── Component Props ─────────────────────────────────────────────────────

export interface MarketOrderFormProps {
  market: Market;
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;
  userPosition: Position | null;
  onSubmit: (params: PlaceTradeRequest) => void;
  tradeHook: ReturnType<typeof import('@/hooks/useTrade').useTrade>;
  defaultOutcome?: 'YES' | 'NO';
}

export interface TradePanelProps {
  market: Market;
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;
  userPosition: Position | null;
  defaultOutcome?: 'YES' | 'NO';
}