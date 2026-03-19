import { apiRequest } from './client';
import type { RegisterRequest, AuthResponse } from './types/api';

/**
 * Registration API service.
 * Handles user registration for /auth/register page.
 * Mirrors backend contract and API docs.
 */
export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
  return data;
}