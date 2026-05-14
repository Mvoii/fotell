import { getTokens, setTokens, clearTokens } from '../auth';
/**
 * Connection-only API client for the Go backend.
 *
 * Scope intentionally limited to transport concerns:
 * - base URL resolution
 * - query-string construction
 * - credentials forwarding
 * - timeout handling
 * - JSON/error parsing
 *
 * Domain routes, payload/response types, and auth workflows are out of scope
 * for this file and should live in route handlers or feature modules.
 */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:8080/api/v1'
).replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 15_000;

type QueryValue = string | number | boolean | undefined | null;

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, QueryValue>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface ApiErrorBody {
  error?: string;
  details?: Record<string, unknown>;
}

export class ApiRequestError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(message: string, status: number, body: ApiErrorBody | null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${cleanPath}`);

  if (!params) return url.toString();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function parseJsonSafe<T>(res: Response): Promise<T | ApiErrorBody | null> {
  const raw = await res.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T | ApiErrorBody;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  // Determine if this is an auth endpoint (do not send token for login/register/refresh)
  const isAuthEndpoint =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh');
  const {
    method = 'GET',
    params,
    body,
    headers,
    signal,
    credentials = 'same-origin',
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> ?? {}),
  };
  // Inject Authorization header if not an auth endpoint and token exists
  if (!isAuthEndpoint) {
    const { access_token } = getTokens();
    if (access_token) {
      finalHeaders['Authorization'] = `Bearer ${access_token}`;
    }
  }

  try {
    let response = await fetch(buildUrl(path, params), {
      method,
      credentials,
      cache: 'no-store',
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    // If 401 and not an auth endpoint, try refresh
    if (!response.ok && response.status === 401 && !isAuthEndpoint) {
      // Try refresh
      const { refresh_token } = getTokens();
      if (refresh_token) {
        // Call refresh endpoint
        try {
          const refreshRes = await fetch(buildUrl('/auth/refresh'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token }),
            credentials,
          });
          if (refreshRes.ok) {
            const refreshData = await parseJsonSafe<any>(refreshRes);
            if (refreshData && typeof refreshData === 'object' && 'access_token' in refreshData && 'refresh_token' in refreshData) {
              setTokens({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token,
              }, window.localStorage.getItem('auth_storage_type') === 'local');
              // Retry original request with new token
              finalHeaders['Authorization'] = `Bearer ${refreshData.access_token}`;
              response = await fetch(buildUrl(path, params), {
                method,
                credentials,
                cache: 'no-store',
                headers: finalHeaders,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: controller.signal,
              });
            } else {
              clearTokens();
              window.location.href = '/auth/login';
              throw new ApiRequestError('Session expired. Please log in again.', 401, null);
            }
          } else {
            clearTokens();
            window.location.href = '/auth/login';
            throw new ApiRequestError('Session expired. Please log in again.', 401, null);
          }
        } catch (refreshErr) {
          clearTokens();
          window.location.href = '/auth/login';
          throw new ApiRequestError('Session expired. Please log in again.', 401, null);
        }
      } else {
        clearTokens();
        window.location.href = '/auth/login';
        throw new ApiRequestError('Session expired. Please log in again.', 401, null);
      }
    }

    const parsed = await parseJsonSafe<T>(response);

    if (!response.ok) {
      const errorBody = (parsed ?? null) as ApiErrorBody | null;
      const message =
        errorBody?.error ??
        `Request failed with status ${response.status}`;
      throw new ApiRequestError(message, response.status, errorBody);
    }

    return {
      data: (parsed ?? ({} as T)) as T,
      status: response.status,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
