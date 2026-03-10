# API Integration Design

> Frontend ↔ Backend contract, Axios client setup, type mapping, and data-flow patterns.

---

## 1. Base Client Setup (`lib/api/client.ts`)

```ts
import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // sends httpOnly refresh cookie
});

// ── Request interceptor — inject access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — silent token refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const newToken = await useAuthStore.getState().refreshToken();
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 2. TypeScript Types (`types/api.ts`)

Mirrors the OpenAPI schemas exactly.

```ts
// ── Auth
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  created_at: string;
}

// ── Markets
export type MarketStatus = 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED';
export type Outcome = 'YES' | 'NO';

export interface Market {
  id: string;
  question: string;
  description?: string;
  status: MarketStatus;
  created_by: string;
  created_at: string;
  closes_at: string;
  liquidity_param_smallest_unit: number;
  yes_price: number | null;
  no_price: number | null;
  resolved_outcome: Outcome | null;
  resolved_at: string | null;
  total_volume_smallest_unit: number;
  total_trades: number;
}

export interface MarketPrices {
  market_id: string;
  yes_price: number;
  no_price: number;
  timestamp: string;
}

// ── Trading
export interface Trade {
  id: string;
  market_id: string;
  user_id: string;
  outcome: Outcome;
  shares_bought_smallest_unit: number;
  cost_paid_smallest_unit: number;
  yes_price_before: number;
  yes_price_after: number;
  created_at: string;
}

export interface TradeReceipt {
  trade_id: string;
  market_id: string;
  outcome: Outcome;
  shares_bought: number;
  cost_paid_smallest_unit: number;
  cost_paid_kes: number;
  yes_price_after: number;
  no_price_after: number;
  timestamp: string;
}

export interface Position {
  id: string;
  market_id: string;
  user_id: string;
  yes_shares_smallest_unit: number;
  no_shares_smallest_unit: number;
  total_cost_basis_smallest_unit: number;
  realized_pnl_smallest_unit: number | null;
}

// ── API Error
export interface ApiError {
  error: string;
  details?: {
    error_code?: string;
    field?: string;
    projected_cost?: number;
    max_cost?: number;
  };
}
```

---

## 3. Financial Formatting Utilities (`lib/formatters.ts`)

The API uses a smallest-unit integer representation:
> `1 KES = 1_000_000_000_000_000_000 (1e18) smallest units`

```ts
const UNIT = 1_000_000_000_000_000_000n; // BigInt for precision

export function toKES(smallestUnit: number | bigint): number {
  return Number(BigInt(smallestUnit) * 100n / UNIT) / 100;
}

export function fromKES(kes: number): bigint {
  return BigInt(Math.round(kes)) * UNIT;
}

export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

// Price: API returns 0–100 float, display as "62.5¢" or "62.5%"
export function formatPrice(price: number, style: 'cents' | 'percent' = 'cents'): string {
  return style === 'cents'
    ? `${price.toFixed(1)}¢`
    : `${price.toFixed(1)}%`;
}

// Shares: API uses smallest unit; display as integer
export function toShares(smallestUnit: number): number {
  return Math.floor(Number(BigInt(smallestUnit) / UNIT));
}
```

---

## 4. API Service Layer (`lib/api/`)

### `auth.service.ts`

```ts
export const authService = {
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  refresh: (refreshToken: string) =>
    apiClient.post<{ access_token: string; expires_in: number }>(
      '/auth/refresh', { refresh_token: refreshToken }
    ),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refresh_token: refreshToken }),
};
```

### `markets.service.ts`

```ts
export const marketsService = {
  list: (params?: { status?: MarketStatus; limit?: number; offset?: number }) =>
    apiClient.get<{ markets: Market[]; total: number }>('/markets', { params }),

  getById: (id: string) =>
    apiClient.get<Market>(`/markets/${id}`),

  getPrices: (id: string) =>
    apiClient.get<MarketPrices>(`/markets/${id}/prices`),

  getTrades: (id: string, limit = 50) =>
    apiClient.get<Trade[]>(`/markets/${id}/trades`, { params: { limit } }),
};
```

### `trading.service.ts`

```ts
export interface PlaceTradeRequest {
  outcome: 'YES' | 'NO';
  shares: number;
  max_cost?: number;   // smallest unit; 0 = disabled
}

export const tradingService = {
  placeTrade: (marketId: string, data: PlaceTradeRequest) =>
    apiClient.post<TradeReceipt>(`/markets/${marketId}/trades`, data),
};
```

### `user.service.ts`

```ts
export const userService = {
  getMe: () => apiClient.get<UserInfo>('/users/me'),

  getBalance: () =>
    apiClient.get<{ balance_smallest_unit: number; balance_kes: number }>('/users/me/balance'),

  getPositions: () => apiClient.get<Position[]>('/users/me/positions'),

  getTrades: (limit = 50) =>
    apiClient.get<Trade[]>('/users/me/trades', { params: { limit } }),
};
```

### `admin.service.ts`

```ts
export interface CreateMarketRequest {
  question: string;
  description?: string;
  closes_at: string;
  liquidity_param: number; // smallest unit — convert from KES before sending
}

export const adminService = {
  createMarket: (data: CreateMarketRequest) =>
    apiClient.post<Market>('/admin/markets', data),

  openMarket: (id: string) =>
    apiClient.post(`/admin/markets/${id}/open`),

  closeMarket: (id: string) =>
    apiClient.post(`/admin/markets/${id}/close`),

  resolveMarket: (id: string, outcome: 'YES' | 'NO') =>
    apiClient.post(`/admin/markets/${id}/resolve`, { outcome }),
};
```

---

## 5. TanStack Query Key Conventions

```ts
// Query keys — use arrays for granular invalidation
export const queryKeys = {
  markets: {
    all: ['markets'] as const,
    list: (filters: object) => ['markets', 'list', filters] as const,
    detail: (id: string) => ['markets', 'detail', id] as const,
    prices: (id: string) => ['markets', 'prices', id] as const,
    trades: (id: string) => ['markets', 'trades', id] as const,
  },
  user: {
    me: ['user', 'me'] as const,
    balance: ['user', 'balance'] as const,
    positions: ['user', 'positions'] as const,
    trades: ['user', 'trades'] as const,
  },
};
```

**Invalidation strategy after trade:**
```ts
// After successful trade, invalidate:
queryClient.invalidateQueries({ queryKey: queryKeys.markets.prices(marketId) });
queryClient.invalidateQueries({ queryKey: queryKeys.markets.trades(marketId) });
queryClient.invalidateQueries({ queryKey: queryKeys.user.balance });
queryClient.invalidateQueries({ queryKey: queryKeys.user.positions });
queryClient.invalidateQueries({ queryKey: queryKeys.user.trades });
```

---

## 6. Optimistic Updates

For trade execution, use optimistic balance decrement to give instant feedback:

```ts
const { mutate: placeTrade } = useMutation({
  mutationFn: (data: PlaceTradeRequest) =>
    tradingService.placeTrade(marketId, data).then(r => r.data),

  onMutate: async (data) => {
    // Cancel inflight balance query
    await queryClient.cancelQueries({ queryKey: queryKeys.user.balance });
    // Snapshot previous balance
    const previous = queryClient.getQueryData(queryKeys.user.balance);
    // Optimistically update balance display
    queryClient.setQueryData(queryKeys.user.balance, (old: BalanceResponse) => ({
      ...old,
      balance_kes: old.balance_kes - (data.max_cost ? toKES(data.max_cost) : 0),
    }));
    return { previous };
  },

  onError: (_, __, context) => {
    // Roll back on error
    queryClient.setQueryData(queryKeys.user.balance, context?.previous);
  },

  onSettled: () => {
    // Always refetch for accuracy
    queryClient.invalidateQueries({ queryKey: queryKeys.user.balance });
  },
});
```

---

## 7. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_NAME=FoTell

# For production:
# NEXT_PUBLIC_API_URL=https://api.fotell.com/api/v1
```

---

## 8. Error Handling Pattern

All API calls wrapped in a standard error extractor:

```ts
export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiError;
  }
  return { error: 'An unexpected error occurred. Please try again.' };
}
```

Usage in components:
```ts
try {
  await placeTrade({ outcome: 'YES', shares: 100, max_cost: maxCostSmallest });
  toast.success('Trade executed!');
} catch (err) {
  const apiError = extractApiError(err);
  if (apiError.details?.error_code === 'SLIPPAGE_EXCEEDED') {
    toast.error('Price moved too much. Adjust your slippage tolerance.');
  } else {
    toast.error(apiError.error);
  }
}
```
