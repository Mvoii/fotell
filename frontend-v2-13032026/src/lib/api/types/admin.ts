// Admin-specific types for market management

export interface CreateMarketRequest {
  question: string;
  description?: string;
  closes_at: string; // ISO 8601 datetime
  liquidity_param: number; // in smallest units
}

export interface CreateMarketResponse {
  id: string;
  question: string;
  description?: string;
  status: 'PENDING';
  created_by: string;
  created_at: string;
  closes_at: string;
  liquidity_param: number;
  yes_price: null;
  no_price: null;
  resolved_outcome: null;
  resolved_at: null;
}

export interface AdminMarketAction {
  market_id: string;
  action: 'open' | 'close' | 'resolve';
  outcome?: 'YES' | 'NO'; // required for resolve action
}

export interface AdminMarketActionResponse {
  message: string;
  status: 'OPEN' | 'CLOSED' | 'RESOLVED';
  outcome?: 'YES' | 'NO';
}

// Validation schema helpers
export const MARKET_CREATION_LIMITS = {
  QUESTION_MIN_LENGTH: 10,
  QUESTION_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 1000,
  LIQUIDITY_PARAM_MIN: 10000, // in smallest units
} as const;

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  limit: number;
  offset: number;
}

export interface SettlementStatus {
  market_id: string;
  question: string;
  resolved_outcome: string;
  resolved_at: string;
  users_pending: number;
  users_ready: number;
  users_processing: number;
  users_settled: number;
  total_paid_cents: number;
}
