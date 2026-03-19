import { useState } from 'react';
import { registerUser } from '@/lib/api/auth.service';
import type { RegisterRequest, AuthResponse } from '@/lib/api/types/api';
import type { ApiRequestError } from '@/lib/api/client';

/**
 * useRegister hook
 * Handles registration flow, loading, error, and success state.
 * Designed for integration in RegisterForm and auth pages.
 */
export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuthResponse | null>(null);

  const register = async (payload: RegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await registerUser(payload);
      setData(response);
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