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
  const {
    method = 'GET',
    params,
    body,
    headers,
    signal,
    credentials = 'include',
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers ?? {}),
  };

  try {
    const response = await fetch(buildUrl(path, params), {
      method,
      credentials,
      cache: 'no-store',
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

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
