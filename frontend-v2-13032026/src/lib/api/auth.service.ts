import { apiRequest } from './client';
import type { RegisterRequest, LoginRequest, AuthResponse } from './types/api';

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

/**
 * Login API service.
 * Handles user login for /auth/login page.
 * Mirrors backend contract and API docs.
 */
export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
  return data;
}

/**
 * Logout API service.
 * Handles user logout.
 */
export async function logoutUser(refreshToken: string): Promise<void> {
  await apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
}