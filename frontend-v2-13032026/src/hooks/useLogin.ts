import { useState } from 'react';
import { loginUser } from '@/lib/api/auth.service';
import type { LoginRequest, AuthResponse } from '@/lib/api/types/api';
import type { ApiRequestError } from '@/lib/api/client';
import { setTokens } from '@/lib/auth';

/**
 * useLogin hook
 * Handles login flow, loading, error, and success state.
 * Designed for integration in LoginForm and auth pages.
 */
export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuthResponse | null>(null);

  /**
   * @param payload LoginRequest
   * @param rememberMe boolean - if true, tokens are saved to localStorage, else sessionStorage
   */
  const login = async (payload: LoginRequest, rememberMe: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginUser(payload);
      setData(response);
      // Save tokens to storage
      setTokens({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      }, rememberMe);
      return response;
    } catch (err) {
      let errorMsg = 'Login failed. Please try again.';
      if (err && typeof err === 'object') {
        const apiErr = err as ApiRequestError;
        errorMsg =
          apiErr.body?.error ||
          apiErr.message ||
          errorMsg;
      }
      setError(errorMsg);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    loading,
    error,
    data,
  };
}
