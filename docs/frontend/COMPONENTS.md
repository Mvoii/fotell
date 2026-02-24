# Component Catalogue

> Reusable UI component specifications, prop interfaces, and usage notes.

---

## Naming & File Conventions

```
src/
├── components/
│   ├── ui/               ← Primitive atoms (Button, Input, Badge, Card…)
│   ├── layout/           ← Navbar, Footer, Sidebar, PageContainer
│   ├── markets/          ← MarketCard, MarketStatusBadge, ProbabilityBar
│   ├── charts/           ← PriceChart, VolumeChart
│   ├── trade/            ← TradePanel, TradeConfirmModal, TradeReceipt
│   ├── portfolio/        ← PositionCard, TradeHistoryTable
│   ├── auth/             ← LoginForm, RegisterForm
│   └── admin/            ← CreateMarketWizard, AdminMarketTable
├── hooks/                ← useAuth, useMarket, useTrade, useBalance
├── lib/                  ← api client, formatters, validators
├── store/                ← Zustand stores (auth, ui)
└── types/                ← TypeScript interfaces matching API schemas
```

---

## 1. Primitive Atoms (`components/ui/`)

### `Button`

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'yes' | 'no' | 'danger' | 'ghost' | 'icon';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;           // shows spinner, disables click
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}
```

**Visual spec:** See DESIGN_SYSTEM.md §6.

```tsx
// Examples
<Button variant="primary">Sign In</Button>
<Button variant="yes" size="lg">Buy YES Shares</Button>
<Button variant="no" size="lg">Buy NO Shares</Button>
<Button variant="danger">Resolve Market</Button>
<Button variant="ghost" leftIcon={<ArrowLeft />}>Back</Button>
<Button loading>Processing…</Button>
```

---

### `Badge`

```tsx
interface BadgeProps {
  variant: 'market-status' | 'outcome' | 'custom';
  status?: 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED'; // if variant='market-status'
  outcome?: 'YES' | 'NO';                               // if variant='outcome'
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}
```

---

### `Input`

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;        // red border + error message below
  hint?: string;         // muted text below
  leftAddon?: string;    // e.g. "KES"
  rightAddon?: string;   // e.g. "shares"
  loading?: boolean;     // shows spinner in right addon area
}
```

---

### `Card`

```tsx
interface CardProps {
  children: React.ReactNode;
  hover?: boolean;       // adds hover:border-active transition
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;  // makes entire card clickable (cursor-pointer)
}
```

---

### `Skeleton`

```tsx
interface SkeletonProps {
  variant: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  lines?: number;        // for 'text' variant, renders N skeleton lines
}
```

---

### `Modal`

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;  // default true
}
```

---

### `Tabs`

```tsx
interface TabsProps {
  tabs: Array<{ key: string; label: string; count?: number }>;
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'line' | 'pill';  // line = underline style, pill = pill buttons
}
```

---

### `StatCard`

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;            // e.g. change % in smaller text
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  loading?: boolean;
}
```

---

## 2. Layout Components (`components/layout/`)

### `Navbar`

```tsx
interface NavbarProps {
  transparent?: boolean;   // for landing page hero
}
```

**Internal state:** uses `useAuthStore()` to determine which nav items to show.

**Behaviour:**
- Desktop: horizontal link strip + avatar dropdown
- Mobile: hamburger → slide-in right drawer
- Sticky top, `backdrop-blur-md` on scroll (when transparent=false)
- Active route link has `accent-blue` underline indicator

---

### `PageContainer`

```tsx
interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;   // default true — adds horizontal padding
}
```

---

### `AuthGuard`

```tsx
interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;  // what to render while checking auth
}
```

Usage: wraps page components in `app/` layout files.

---

## 3. Market Components (`components/markets/`)

### `MarketCard`

```tsx
interface MarketCardProps {
  market: Market;        // API type from types/api.ts
  showActions?: boolean; // show "Trade Now" button
  compact?: boolean;     // narrower variant for dashboard lists
}
```

**Layout (see WIREFRAMES.md §3):**
- Status badge + closing date top row
- Question text (line-clamp-2 for compact)
- ProbabilityBar
- Volume + trade count footer
- Optional CTA button

---

### `ProbabilityBar`

```tsx
interface ProbabilityBarProps {
  yesPrice: number;     // 0–100
  noPrice: number;      // 0–100
  showLabels?: boolean; // "YES 62.5¢" / "NO 37.5¢" on either side
  size?: 'sm' | 'md';   // sm: h-1.5, md: h-2.5
}
```

**Renders:**
```
[──── YES fill (green) ────][──── NO fill (red) ────]
 62.5%                                         37.5%
```

---

### `PriceChart`

```tsx
interface PriceChartProps {
  marketId: string;
  // fetches trade history from GET /markets/:id/trades internally
  period?: '24h' | '7d' | '30d' | 'all';
  height?: number;         // default 220
  showVolume?: boolean;    // renders volume bars below price line
}
```

**Implementation:**
- Uses `recharts` `ComposedChart`
- YES probability line: `stroke="#00c853"`, area fill `rgba(0,200,83,0.08)`
- NO probability line: `stroke="#ff1744"`, area fill `rgba(255,23,68,0.08)`
- Tooltip: styled dark card showing timestamp, YES price, NO price, last trade cost
- Period toggle: tab pills above chart

---

### `MarketStatusBadge`

```tsx
interface MarketStatusBadgeProps {
  status: 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED';
  size?: 'sm' | 'md';
}
```

---

### `MarketFilters`

```tsx
interface MarketFiltersProps {
  filters: { status?: string; sort?: string; q?: string };
  onChange: (filters: Partial<MarketFiltersProps['filters']>) => void;
}
```

**Renders:** search input + status chip pills + sort dropdown.

---

## 4. Trade Components (`components/trade/`)

### `TradePanel`

```tsx
interface TradePanelProps {
  market: Market;
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;   // null = not authenticated
  userPosition: Position | null;
}
```

**Internal state:**
- `selectedOutcome: 'YES' | 'NO'` — toggled by YES/NO tab buttons
- `shares: number` — controlled input (integer only, min 1)
- `maxSlippagePct: number` — default 5%
- `estimatedCost: number` — recalculated on `shares` change via `useTradeEstimate` hook

**On submit:** opens `TradeConfirmModal`.

---

### `TradeConfirmModal`

```tsx
interface TradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  tradeDetails: {
    market: Market;
    outcome: 'YES' | 'NO';
    shares: number;
    estimatedCost: number;
    maxCost: number;
    currentBalance: number;
  };
}
```

**States:** idle → loading → success → error  
**On success:** shows `TradeReceiptCard` inside modal.

---

### `TradeReceiptCard`

```tsx
interface TradeReceiptCardProps {
  receipt: TradeReceipt;  // API response type
  onViewPortfolio: () => void;
  onTradeAgain: () => void;
}
```

---

## 5. Portfolio Components (`components/portfolio/`)

### `PositionCard`

```tsx
interface PositionCardProps {
  position: Position;
  market: Market;           // joined for display name + current price
  currentPrice: number;     // yes_price or no_price depending on position side
}
```

**Computed values displayed:**
- `currentValue = shares * currentPrice / 100 * 100` (shares × KES 1 if resolved YES)
- `unrealizedPnL = currentValue - costBasis`
- PnL shown in green if positive, red if negative

---

### `TradeHistoryTable`

```tsx
interface TradeHistoryTableProps {
  trades: Trade[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

**Columns:** Date/Time | Market | Side (YES/NO badge) | Shares | Cost | Price Before | Price After

---

## 6. Admin Components (`components/admin/`)

### `AdminMarketTable`

```tsx
interface AdminMarketTableProps {
  markets: Market[];
  loading: boolean;
  onOpen: (marketId: string) => void;
  onClose: (marketId: string) => void;
  onResolve: (marketId: string, outcome: 'YES' | 'NO') => void;
}
```

---

### `CreateMarketWizard`

Steps managed by local `step: 1 | 2 | 3` state.

```tsx
// Step data shape
interface CreateMarketFormData {
  question: string;        // 1–500 chars
  description?: string;
  closes_at: string;       // ISO 8601 datetime
  liquidity_param: number; // converted to smallest unit on submit
}
```

**Validation (Zod schema):**
```ts
const createMarketSchema = z.object({
  question: z.string().min(1).max(500),
  description: z.string().optional(),
  closes_at: z.string().datetime({ message: "Must be a future date/time" })
    .refine(d => new Date(d) > new Date(), "Close date must be in the future"),
  liquidity_param: z.number().int().min(1),
})
```

---

### `ResolveMarketModal`

```tsx
interface ResolveMarketModalProps {
  isOpen: boolean;
  market: Market;
  onClose: () => void;
  onResolve: (outcome: 'YES' | 'NO') => Promise<void>;
}
```

**Danger UX:** Irreversible warning banner, red "Resolve Market" confirm button only activates after user selects an outcome.

---

## 7. Custom Hooks (`hooks/`)

### `useAuthStore()`

Zustand store selector. Returns:
```ts
{
  user: UserInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
}
```

### `useBalance()`

TanStack Query wrapper for `GET /users/me/balance`.  
Auto-refetches every 30 seconds while window is focused.

### `useMarkets(filters)`

TanStack Query wrapper for `GET /markets?status=…&limit=…&offset=…`.

### `useMarket(id)`

TanStack Query wrapper for `GET /markets/:id` + `GET /markets/:id/prices`.

### `useTrade(marketId)`

Mutation + helper:
```ts
{
  placeTrade: (params: TradeParams) => Promise<TradeReceipt>;
  isLoading: boolean;
  error: ApiError | null;
  estimateCost: (shares: number, outcome: 'YES' | 'NO') => number;
}
```

### `usePositions()`

TanStack Query wrapper for `GET /users/me/positions`.

### `useTradeHistory(limit?)`

TanStack Query wrapper for `GET /users/me/trades?limit=…`.
