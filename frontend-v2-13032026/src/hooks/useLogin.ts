import { useState } from 'react';
import { loginUser } from '@/lib/api/auth.service';
import type { LoginRequest, AuthResponse } from '@/lib/api/types/api';
import type { ApiRequestError } from '@/lib/api/client';

/**
 * useLogin hook
 * Handles login flow, loading, error, and success state.
 * Designed for integration in LoginForm and auth pages.
 */
export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuthResponse | null>(null);

  const login = async (payload: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginUser(payload);
      setData(response);
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
