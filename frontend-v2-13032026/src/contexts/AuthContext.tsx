"use client";

/**
 * AuthContext
 *
 * Provides a reactive, app-wide view of the user's authentication status.
 * The backend is the definitive source of truth: `isAuthenticated` is only
 * true when the in-memory access token is present AND the /user/me endpoint
 * responds successfully.
 *
 * Use `useAuth()` anywhere in the tree to read auth state or trigger logout.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTokens, clearTokens } from '@/lib/tokenStore';
import { userService } from '@/lib/api/user.service';
import type { UserProfile } from '@/lib/api/types/api';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** True only when a valid access token exists AND the backend confirmed it. */
  isAuthenticated: boolean;
  /** The profile returned by /user/me, or null if not authenticated. */
  user: UserProfile | null;
  /** True while the initial auth-check is in flight. */
  isLoading: boolean;
  /**
   * Call to programmatically invalidate local auth state.
   * Prefer `useLogout()` for full logout (server revocation + redirect).
   */
  clearAuth: () => void;
}

// ─── Context + hook ───────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Wipe all local auth state without redirecting. */
  const clearAuth = useCallback(() => {
    clearTokens();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  /**
   * On mount, check whether we already have a token in memory.
   * If yes, validate it against the backend; otherwise mark loading done.
   * (Tokens are in-memory only, so on a full page refresh they're gone and
   * the user is effectively logged out.)
   */
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const { access_token } = getTokens();

      if (!access_token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const { data } = await userService.getMe();
        if (!cancelled) setUser(data);
      } catch {
        // Token invalid / expired — clean up silently
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [clearAuth]);

  const isAuthenticated = !isLoading && user !== null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
