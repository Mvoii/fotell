import { useState } from 'react';
import { registerUser } from '@/lib/api/auth.service';
import type { RegisterRequest, AuthResponse } from '@/lib/api/types/api';
import type { ApiRequestError } from '@/lib/api/client';
import { setTokens } from '@/lib/auth';

/**
 * useRegister hook
 * Handles registration flow, loading, error, and success state.
 * Designed for integration in RegisterForm and auth pages.
 */
export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuthResponse | null>(null);

  /**
   * @param payload RegisterRequest
   * @param rememberMe boolean - if true, tokens are saved to localStorage, else sessionStorage
   */
  const register = async (payload: RegisterRequest, rememberMe: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await registerUser(payload);
      setData(response);
      // Save tokens to storage
      setTokens({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      }, rememberMe);
      return response;
    } catch (err) {
      let errorMsg = 'Registration failed. Please try again.';
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
    register,
    loading,
    error,
    data,
  };
}