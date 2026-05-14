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
