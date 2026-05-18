// src/lib/tokenStore.ts
// XSS-immune in-memory token store.
// Tokens are held in module-level variables — they survive re-renders but are
// wiped on full page refresh (which is acceptable: the app re-authenticates via
// the /auth/refresh endpoint using an HttpOnly cookie, or the user logs in again).

import type { AuthResponse } from './api/types/api';

interface TokenState {
  access_token: string | null;
  refresh_token: string | null;
}

let _tokens: TokenState = {
  access_token: null,
  refresh_token: null,
};

/**
 * Store access + refresh tokens in memory.
 * Never writes to localStorage or sessionStorage.
 */
export function setTokens(
  tokens: Pick<AuthResponse, 'access_token' | 'refresh_token'>,
): void {
  _tokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  };
}

/**
 * Read the currently stored tokens.
 * Returns `null` for both if the store has been cleared or the user is logged out.
 */
export function getTokens(): TokenState {
  return { ..._tokens };
}

/**
 * Wipe all tokens from memory (call on logout or session expiry).
 */
export function clearTokens(): void {
  _tokens = { access_token: null, refresh_token: null };
}
