// ── FoTell TypeScript interfaces ─────────────────────────────────────
// Single source of truth — mirrors the Go API response shapes exactly.

export type MarketStatus = "PENDING" | "OPEN" | "CLOSED" | "RESOLVED";
export type Outcome = "YES" | "NO";
export type OrderStatus = "PENDING" | "FILLED" | "CANCELLED" | "EXPIRED";
export type OrderType = "MARKET" | "LIMIT";
export type OrderExpiry = "1h" | "24h" | "7d" | "GTC";
export type UserRole = "USER" | "ADMIN";

// ── Market ────────────────────────────────────────────────────────────
export interface Market {
  id: string;
  question: string;
  description?: string;
  status: MarketStatus;
  closes_at: string;          // ISO-8601
  liquidity_param: number;    // b parameter
  yes_price: number;          // 0–100 cents
  no_price: number;
  volume_kes: number;
  trade_count: number;
  created_at: string;
}

// ── User ──────────────────────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  balance_kes: number;
  created_at: string;
}

// ── Position ─────────────────────────────────────────────────────────
export interface Position {
  id: string;
  market_id: string;
  market?: Market;            // populated in list responses
  user_id: string;
  outcome: Outcome;
  shares: number;
  cost_basis_kes: number;
}

// ── Trade ─────────────────────────────────────────────────────────────
export interface Trade {
  id: string;
  market_id: string;
  market?: Market;
  user_id: string;
  outcome: Outcome;
  shares: number;
  cost_kes: number;
  price_before: number;
  price_after: number;
  type: OrderType;
  created_at: string;
}

// ── Order (limit orders) ──────────────────────────────────────────────
export interface Order {
  id: string;
  market_id: string;
  market?: Market;
  user_id: string;
  type: OrderType;
  outcome: Outcome;
  shares: number;
  trigger_price: number;       // cents; limit orders only
  status: OrderStatus;
  placed_at: string;
  expires_at: string | null;
  filled_at: string | null;
  filled_price: number | null;
}

// ── Watchlist ─────────────────────────────────────────────────────────
export interface WatchlistEntry {
  id: string;
  user_id: string;
  market_id: string;
  market: Market;
  created_at: string;
  alert: PriceAlert | null;
}

// ── Price Alert ───────────────────────────────────────────────────────
export interface PriceAlert {
  id: string;
  watchlist_entry_id: string;
  market_id: string;
  side: Outcome;
  condition: "gte" | "lte";
  target_price: number;        // cents
  notify_in_app: boolean;
  notify_email: boolean;
  triggered_at: string | null;
  created_at: string;
}

// ── Portfolio Stats (IBKR-style stats bar) ────────────────────────────
export interface PortfolioStats {
  cash_balance: number;
  positions_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  daily_pnl: number;
  open_orders_count: number;
}

// ── Notification ──────────────────────────────────────────────────────
export type NotificationType =
  | "price_alert"
  | "order_filled"
  | "order_expired"
  | "order_cancelled"
  | "market_resolved";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  deep_link: string;
  read: boolean;
  created_at: string;
}

// ── API request/response shapes ───────────────────────────────────────
export interface MarketOrderParams {
  market_id: string;
  outcome: Outcome;
  shares: number;
  max_slippage_pct: number;    // default 5
}

export interface LimitOrderParams {
  market_id: string;
  outcome: Outcome;
  shares: number;
  trigger_price: number;       // cents
  expiry: OrderExpiry;
}

export interface TradeReceipt {
  trade: Trade;
  new_yes_price: number;
  new_no_price: number;
  new_balance: number;
  message: string;
}

export interface LimitOrderReceipt {
  order: Order;
  message: string;
}

export interface CreateAlertParams {
  side: Outcome;
  condition: "gte" | "lte";
  target_price: number;
  notify_in_app: boolean;
  notify_email: boolean;
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface AuthTokens {
  access_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  username: string;
  email: string;
  password: string;
}

// ── API error ─────────────────────────────────────────────────────────
export interface ApiError {
  status: number;
  code: string;
  message: string;
}

// ── Pagination ────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
