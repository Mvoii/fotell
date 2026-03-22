// src/lib/auth.ts
// Utility for managing auth tokens in localStorage/sessionStorage based on rememberMe flag

import type { AuthResponse } from './api/types/api';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const STORAGE_TYPE_KEY = 'auth_storage_type'; // 'local' or 'session'

function getStorage(): Storage {
  if (typeof window === 'undefined') return localStorage; // SSR safety
  const type = window.sessionStorage.getItem(STORAGE_TYPE_KEY) || window.localStorage.getItem(STORAGE_TYPE_KEY);
  return type === 'local' ? window.localStorage : window.sessionStorage;
}

export function setTokens(tokens: Pick<AuthResponse, 'access_token' | 'refresh_token'>, rememberMe: boolean) {
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  storage.setItem(STORAGE_TYPE_KEY, rememberMe ? 'local' : 'session');
  // Remove from the other storage to avoid stale tokens
  const other = rememberMe ? window.sessionStorage : window.localStorage;
  other.removeItem(ACCESS_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);
  other.removeItem(STORAGE_TYPE_KEY);
}

export function getTokens(): { access_token: string | null; refresh_token: string | null } {
  const storage = getStorage();
  return {
    access_token: storage.getItem(ACCESS_TOKEN_KEY),
    refresh_token: storage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(STORAGE_TYPE_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(STORAGE_TYPE_KEY);
}
