# Component Catalogue

> **v2** — Updated for founder feedback: LimitOrderForm, WatchlistCard, PriceAlertSheet,
> StatsBar, OrdersTable, BottomNav, GlobalTradeSheet, OpenOrderCard, ActivityFeedItem.

---

## Naming & File Conventions

```
src/
├── components/
│   ├── ui/               ← Primitive atoms (Button, Input, Badge, Card, Tabs…)
│   ├── layout/           ← BottomNav, TopNav, LeftRail, PageContainer, AuthGuard
│   ├── markets/          ← MarketCard, MarketStatusBadge, ProbabilityBar
│   ├── charts/           ← PriceChart, VolumeChart
│   ├── trade/            ← MarketOrderForm, LimitOrderForm, TradePanel,
│   │                        TradeConfirmModal, LimitOrderConfirmModal, TradeReceipt
│   ├── portfolio/        ← StatsBar, PositionCard, BalanceSummary,
│   │                        OrdersTable, OpenOrderCard, TradeHistoryTable
│   ├── watchlist/        ← WatchlistCard, PriceAlertSheet, WatchlistToggle
│   ├── home/             ← AccountSnapshot, ActivityFeedItem, ActivityFeed,
│   │                        OpenOrdersMini, TrendingMarkets
│   ├── auth/             ← LoginForm, RegisterForm
│   └── admin/            ← CreateMarketWizard, AdminMarketTable, ResolveMarketModal
├── hooks/                ← useAuth, useMarket, useTrade, useBalance, useOrders,
│                            useWatchlist, usePriceAlerts, usePositions, useTradeHistory
├── lib/                  ← api client, formatters, validators, notifications
├── store/                ← Zustand stores (auth, ui, watchlist, orders)
└── types/                ← TypeScript interfaces matching API schemas
```

---

## 1. Primitive Atoms (`components/ui/`)

### `Button`

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'yes' | 'no' | 'danger' | 'ghost' | 'icon';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}
```

```tsx
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
  variant: 'market-status' | 'order-status' | 'order-type' | 'outcome' | 'custom';
  status?: 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED';        // market-status
  orderStatus?: 'PENDING' | 'FILLED' | 'CANCELLED' | 'EXPIRED'; // order-status
  orderType?: 'MARKET' | 'LIMIT';                               // order-type
  outcome?: 'YES' | 'NO';                                       // outcome
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}
```

---

### `Input`

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: string;    // e.g. "KES"
  rightAddon?: string;   // e.g. "¢"
  loading?: boolean;
}
```

---

### `Card`

```tsx
interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}
```

---

### `Skeleton`

```tsx
interface SkeletonProps {
  variant: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  lines?: number;
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
  closeOnOverlayClick?: boolean;
}
```

---

### `BottomSheet`

```tsx
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: number[];   // heights in px; default [400, window.innerHeight]
  children: React.ReactNode;
}
```

Used for: Trade Panel (mobile), Price Alert Sheet, Global Trade Sheet.

---

### `Tabs`

```tsx
interface TabsProps {
  tabs: Array<{ key: string; label: string; count?: number }>;
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'line' | 'pill';
}
```

---

### `StatCard`

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  loading?: boolean;
}
```

---

## 2. Layout Components (`components/layout/`)

### `BottomNav`

```tsx
interface BottomNavProps {
  activeTab: 'home' | 'markets' | 'trade' | 'watchlist' | 'portfolio';
  pendingOrdersCount?: number;    // badge on Portfolio tab
  unreadAlertsCount?: number;     // badge on Home tab
  onTradePress: () => void;       // opens GlobalTradeSheet instead of routing
}
```

**Behaviour:**
- Fixed bottom, height 56 px, `bg-surface`, `border-t border-muted`
- Active tab: icon + label in `accent-blue`, filled dot indicator below label
- Trade tab calls `onTradePress` instead of routing
- Hidden on desktop (≥ 1024 px); replaced by `LeftRail`

---

### `LeftRail`

```tsx
interface LeftRailProps {
  activeRoute: string;    // current pathname
  isAdmin?: boolean;
}
```

**Behaviour:**
- Visible on desktop (≥ 1024 px) only
- 64 px collapsed (icons only), 220 px on hover (icons + labels)
- `transition-width duration-200`

---

### `TopNav`

```tsx
interface TopNavProps {
  transparent?: boolean;    // landing page hero
  showSearch?: boolean;     // desktop global search bar
}
```

---

### `PageContainer`

```tsx
interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}
```

---

### `AuthGuard`

```tsx
interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}
```

---

## 3. Market Components (`components/markets/`)

### `MarketCard`

```tsx
interface MarketCardProps {
  market: Market;
  showActions?: boolean;
  compact?: boolean;
  isWatched?: boolean;
  onWatchToggle?: (marketId: string) => void;
}
```

**New in v2:** `isWatched` shows filled 👁 icon; `onWatchToggle` fires on icon press (auth-gated).

---

### `ProbabilityBar`

```tsx
interface ProbabilityBarProps {
  yesPrice: number;     // 0–100
  noPrice: number;
  showLabels?: boolean;
  size?: 'sm' | 'md';
}
```

---

### `PriceChart`

```tsx
interface PriceChartProps {
  marketId: string;
  period?: '24h' | '7d' | '30d' | 'all';
  height?: number;
  showVolume?: boolean;
}
```

Uses `recharts` `ComposedChart`. YES line: `#00c853`, NO line: `#ff1744`.

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

---

## 4. Trade Components (`components/trade/`)

### `TradePanel`

> Container component that hosts the unified Buy/Sell tabs, Order Type switcher,
> YES/NO outcome selectors, and either `MarketOrderForm` or `LimitOrderForm`.

```tsx
interface TradePanelProps {
  market: Market;
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;
  userPosition: Position | null;
  defaultSide?: 'BUY' | 'SELL';
  defaultOrderType?: 'market' | 'limit';
  defaultOutcome?: 'YES' | 'NO';
}
```

Internal state:
- `side: 'BUY' | 'SELL'` — top-level tabs
- `orderType: 'market' | 'limit'` — dropdown/pill switcher
- `outcome: 'YES' | 'NO'` — side-by-side selection cards
- Renders `<MarketOrderForm>` or `<LimitOrderForm>` based on `orderType`, passing the parent state.

---

### `MarketOrderForm`

```tsx
interface MarketOrderFormProps {
  market: Market;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;
  userPosition: Position | null;
  onSubmit: (params: MarketOrderParams) => void;
}

interface MarketOrderParams {
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  inputMode: 'cash' | 'shares';
  amount: number; // KES amount (cash mode) or number of shares (shares mode)
  maxSlippagePct: number;
}
```

Internal state:
- `inputMode: 'cash' | 'shares'` (allows toggling input mode)
- `amount: number` (integer/decimal values)
- `maxSlippagePct: number` (default 5)
- Computed estimates:
  - `sharesCount: number` — number of shares (either input directly or calculated from cash amount)
  - `totalCost: number` — total cost in KES (either input directly as cash or calculated from shares)
  - `maxPayout: number` — potential payout if outcome resolves correct (`sharesCount × 1.00 KES`)
  - `potentialProfit: number` — `maxPayout − totalCost`
  - `potentialProfitPct: number` — `(potentialProfit / totalCost) × 100`

On submit → opens `<TradeConfirmModal>`.

---

### `LimitOrderForm`

> Allows placing orders that execute when price hits a target trigger.

```tsx
interface LimitOrderFormProps {
  market: Market;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;
  userPosition: Position | null;
  onSubmit: (params: LimitOrderParams) => void;
}

interface LimitOrderParams {
  marketId: string;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  inputMode: 'cash' | 'shares';
  amount: number; // KES amount (cash mode) or number of shares (shares mode)
  triggerPrice: number;    // in cents (0–100)
  expiry: '1h' | '24h' | '7d' | 'GTC';
}
```

Internal state:
- `inputMode: 'cash' | 'shares'`
- `amount: number`
- `triggerPrice: number` — defaults to `currentPrices[outcome] - 10%`
- `expiry: '1h' | '24h' | '7d' | 'GTC'` — pill toggle
- Computed estimates:
  - `sharesCount: number` — quantity of shares (calculated from triggerPrice if in cash mode)
  - `estimatedMaxCost: number` — `sharesCount × triggerPrice / 100`
  - `maxPayout: number` — potential payout if filled and resolved correct (`sharesCount × 1.00 KES`)
  - `potentialProfit: number` — `maxPayout − estimatedMaxCost`

On submit → opens `<LimitOrderConfirmModal>`.

**Validation:**
- `triggerPrice` must be in range [1, 99]
- For BUY: default trigger = current price − 10% (enter cheaper)
- For SELL: default trigger = current price + 10% (sell for more)

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

States: idle → loading → success → error
On success: renders `<TradeReceiptCard>` inside modal.

---

### `LimitOrderConfirmModal`

> **New in v2.**

```tsx
interface LimitOrderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  orderDetails: {
    market: Market;
    outcome: 'YES' | 'NO';
    shares: number;
    triggerPrice: number;
    estimatedMaxCost: number;
    expiry: string;
  };
}
```

States: idle → loading → success (order placed) → error

---

### `TradeReceiptCard`

```tsx
interface TradeReceiptCardProps {
  receipt: TradeReceipt | LimitOrderReceipt;
  type: 'market' | 'limit';
  onViewPortfolio: () => void;
  onViewOrders?: () => void;    // limit only
  onTradeAgain: () => void;
}
```

---

### `GlobalTradeSheet`

> **New in v2.** Full-height bottom sheet opened by Trade tab in BottomNav.

```tsx
interface GlobalTradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}
```

Internal behaviour:
1. Renders a market search input
2. Shows recently-viewed markets list
3. On market select → renders full `<TradePanel>` below search results
4. After successful trade → shows receipt, then auto-closes after 3s

---

## 5. Portfolio Components (`components/portfolio/`)

### `StatsBar`

> **New in v2.** IBKR-style horizontal scrolling stats strip.

```tsx
interface StatsBarProps {
  stats: Array<{
    key: string;
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'neutral';
    tooltip?: string;   // definition shown on tap
  }>;
  loading?: boolean;
}
```

Stats included:
- Unrealized P&L, Realized P&L, Market Value, Buying Power
- Daily P&L, Total Cash, Open Orders count

**Renders:** horizontal scroll row of `StatChip` sub-components.
On chip tap → tooltip/popover with label definition.

---

### `PositionCard`

```tsx
interface PositionCardProps {
  position: Position;
  market: Market;
  currentPrice: number;
  onViewMarket: () => void;
  onTradeMore: () => void;
  onClosePosition: () => void;
}
```

Computed display values:
- `currentValue = shares × currentPrice / 100`
- `unrealizedPnL = currentValue − costBasis`
- PnL: green if positive, red if negative, neutral if ±0

---

### `BalanceSummary`

> **New in v2.** Static summary card for Balances tab.

```tsx
interface BalanceSummaryProps {
  cashBalance: number;
  positionsValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  loading?: boolean;
}
```

---

### `OrdersTable`

> **New in v2.** Full table of orders with status filter.

```tsx
interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  filter: 'open' | 'filled' | 'cancelled';
  onFilterChange: (filter: 'open' | 'filled' | 'cancelled') => void;
  onCancel: (orderId: string) => Promise<void>;
  onEditTrigger: (orderId: string) => void;
}
```

---

### `OpenOrderCard`

> **New in v2.** Single order row with cancel / edit actions.

```tsx
interface OpenOrderCardProps {
  order: Order;
  market: Market;
  onCancel: () => void;
  onEditTrigger?: () => void;
}
```

State: idle | confirming-cancel (shows inline confirm)

---

### `TradeHistoryTable`

```tsx
interface TradeHistoryTableProps {
  trades: Trade[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortBy?: 'date' | 'market' | 'cost';
  onSortChange?: (sort: 'date' | 'market' | 'cost') => void;
}
```

Columns: Date/Time | Market | Side | Shares | Cost | Type (MKT/LMT)

---

## 6. Watchlist Components (`components/watchlist/`)

### `WatchlistCard`

> **New in v2.** Extends `MarketCard` with alert badge and watch/remove actions.

```tsx
interface WatchlistCardProps {
  market: Market;
  currentPrices: { yes_price: number; no_price: number };
  alert: PriceAlert | null;
  onTrade: (marketId: string) => void;
  onSetAlert: (marketId: string) => void;
  onRemove: (marketId: string) => void;
}
```

Displays: 24 h price change %, active alert if set, Trade / Edit Alert / Remove actions.

---

### `PriceAlertSheet`

> **New in v2.** Bottom sheet for creating or editing a price alert.

```tsx
interface PriceAlertSheetProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market;
  existingAlert?: PriceAlert;
  onSave: (alert: CreateAlertParams) => Promise<void>;
  onDelete?: () => Promise<void>;
}

interface CreateAlertParams {
  marketId: string;
  side: 'YES' | 'NO';
  condition: 'gte' | 'lte';    // ≥ or ≤
  targetPrice: number;          // in cents
  notifyInApp: boolean;
  notifyEmail: boolean;
}
```

---

### `WatchlistToggle`

> **New in v2.** Standalone icon button to add/remove a market from watchlist.
> Used inline in `MarketCard` and `Market Detail` header.

```tsx
interface WatchlistToggleProps {
  marketId: string;
  isWatched: boolean;
  onToggle: (marketId: string, watched: boolean) => void;
  size?: 'sm' | 'md';
}
```

Renders: 👁 outline (not watched) → 👁 filled accent-blue (watched).
Auth-gated: if user not logged in, shows toast "Log in to watch markets."

---

## 7. Home Components (`components/home/`)

### `AccountSnapshot`

> **New in v2.** Horizontal scroll of 3 stat chips at top of Home feed.

```tsx
interface AccountSnapshotProps {
  cashBalance: number;
  portfolioValue: number;
  dailyPnL: number;
  dailyPnLPct: number;
  loading?: boolean;
  onChipPress?: (key: 'cash' | 'portfolio' | 'pnl') => void;
}
```

---

### `ActivityFeedItem`

> **New in v2.** Single row in the Recent Activity list.

```tsx
type ActivityEvent =
  | { type: 'TRADE'; trade: Trade; market: Market }
  | { type: 'PAYOUT'; amount: number; market: Market; outcome: 'YES' | 'NO' }
  | { type: 'ORDER_FILLED'; order: Order; market: Market }
  | { type: 'ORDER_EXPIRED'; order: Order; market: Market };

interface ActivityFeedItemProps {
  event: ActivityEvent;
}
```

Icon colours: 🟢 trade executed, 🔵 trade info, ✅ payout received, 🔔 order filled.

---

### `OpenOrdersMini`

> **New in v2.** Compact open-orders section on Home feed.

```tsx
interface OpenOrdersMiniProps {
  orders: Order[];
  markets: Record<string, Market>;
  onCancel: (orderId: string) => void;
  onViewAll: () => void;
}
```

Renders up to 3 most recent pending orders. "View All" routes to `/portfolio?tab=orders`.
Hidden when `orders.length === 0`.

---

## 8. Admin Components (`components/admin/`)

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

```tsx
interface CreateMarketFormData {
  question: string;
  description?: string;
  closes_at: string;       // ISO 8601
  liquidity_param: number;
}
```

Zod validation schema:
```ts
const createMarketSchema = z.object({
  question: z.string().min(1).max(500),
  description: z.string().optional(),
  closes_at: z.string().datetime()
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

Danger UX: irreversible warning, confirm button only activates after outcome is selected.

---

## 9. Custom Hooks (`hooks/`)

### `useAuthStore()`

```ts
{
  user: UserInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginParams) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
}
```

---

### `useBalance()`

TanStack Query — `GET /users/me/balance`. Auto-refetches every 30 s on focus.

---

### `useMarkets(filters)`

TanStack Query — `GET /markets?status=…&sort=…&q=…&limit=…&offset=…`.

---

### `useMarket(id)`

TanStack Query — `GET /markets/:id` + `GET /markets/:id/prices`.

---

### `useTrade(marketId)`

```ts
{
  placeTrade: (params: MarketOrderParams) => Promise<TradeReceipt>;
  isLoading: boolean;
  error: ApiError | null;
  estimateCost: (shares: number, outcome: 'YES' | 'NO') => number;
}
```

---

### `useLimitOrder()` ← **New in v2**

```ts
{
  placeOrder: (params: LimitOrderParams) => Promise<LimitOrderReceipt>;
  cancelOrder: (orderId: string) => Promise<void>;
  editTrigger: (orderId: string, newPrice: number) => Promise<void>;
  isLoading: boolean;
  error: ApiError | null;
}
```

---

### `useOrders(filter?)` ← **New in v2**

TanStack Query — `GET /users/me/orders?status=PENDING|FILLED|CANCELLED`.

```ts
{
  orders: Order[];
  isLoading: boolean;
  refetch: () => void;
}
```

---

### `useWatchlist()` ← **New in v2**

```ts
{
  watchlist: WatchlistEntry[];   // { marketId, market, alert? }
  isWatched: (marketId: string) => boolean;
  addToWatchlist: (marketId: string) => Promise<void>;
  removeFromWatchlist: (marketId: string) => Promise<void>;
  isLoading: boolean;
}
```

---

### `usePriceAlerts()` ← **New in v2**

```ts
{
  alerts: PriceAlert[];
  createAlert: (params: CreateAlertParams) => Promise<void>;
  updateAlert: (alertId: string, params: Partial<CreateAlertParams>) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  isLoading: boolean;
}
```

---

### `usePositions()`

TanStack Query — `GET /users/me/positions`.

---

### `useTradeHistory(limit?)`

TanStack Query — `GET /users/me/trades?limit=…&page=…`.

---

### `usePortfolioStats()` ← **New in v2**

Aggregates balance + positions + orders for the StatsBar:

```ts
{
  cashBalance: number;
  positionsValue: number;
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dailyPnL: number;
  openOrdersCount: number;
  isLoading: boolean;
}
```

---

## 10. TypeScript Types (`types/`)

```ts
// Existing
interface Market { id: string; question: string; description?: string;
  status: 'PENDING'|'OPEN'|'CLOSED'|'RESOLVED'; closes_at: string;
  liquidity_param: number; yes_price: number; no_price: number;
  volume_kes: number; trade_count: number; }

interface Position { id: string; market_id: string; user_id: string;
  outcome: 'YES'|'NO'; shares: number; cost_basis_kes: number; }

interface Trade { id: string; market_id: string; user_id: string;
  outcome: 'YES'|'NO'; shares: number; cost_kes: number;
  price_before: number; price_after: number; created_at: string; }

// New in v2
interface Order {
  id: string;
  market_id: string;
  user_id: string;
  type: 'MARKET' | 'LIMIT';
  outcome: 'YES' | 'NO';
  shares: number;
  trigger_price: number;   // cents, limit orders only
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
  placed_at: string;
  expires_at: string | null;
  filled_at: string | null;
  filled_price: number | null;
}

interface WatchlistEntry {
  id: string;
  user_id: string;
  market_id: string;
  market: Market;
  created_at: string;
  alert: PriceAlert | null;
}

interface PriceAlert {
  id: string;
  watchlist_entry_id: string;
  market_id: string;
  side: 'YES' | 'NO';
  condition: 'gte' | 'lte';
  target_price: number;    // cents
  notify_in_app: boolean;
  notify_email: boolean;
  triggered_at: string | null;
  created_at: string;
}

interface LimitOrderReceipt {
  order: Order;
  message: string;
}

interface PortfolioStats {
  cash_balance: number;
  positions_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  daily_pnl: number;
  open_orders_count: number;
}
```
