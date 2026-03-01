# Wireframes & Layout Specifications

> **v2** — Updated for founder feedback: mobile-first 5-tab bottom navigation, limit orders,
> Home feed, Watchlist, Orders management, and IBKR-style Portfolio stats bar.

---

## Legend

```
┌─ ─ ─ ─┐  Dashed = optional / conditional element
█████████   Dark fill = primary action / strong accent
░░░░░░░░░   Light fill = secondary surface / card
[  BTN  ]   Button
< input >   Input field
~~~graph~~~  Chart placeholder
[BADGE]     Status badge
▼ / ▲       Chevron / disclosure
●           Active / filled dot
○           Inactive / empty dot
```

---

## App Shell — 5-Tab Bottom Navigation (Mobile-First)

The app shell wraps every authenticated screen with a **5-tab bottom navigation bar**.
On desktop (≥ 1024 px) this morphs into a left sidebar rail.

```
MOBILE — Bottom Nav Bar (fixed bottom, 56 px tall, bg-surface border-top)
┌──────────────────────────────────────────────────────────────────┐
│  🏠        📈        🔄        👁        👤                       │
│  Home    Markets   Trade   Watchlist Portfolio                   │
│  ●         ○         ○         ○         ○   ← active dot        │
└──────────────────────────────────────────────────────────────────┘
```

| Tab | Icon | Route | Auth Required |
|---|---|---|---|
| Home | 🏠 House | `/home` | Yes |
| Markets | 📈 Chart | `/markets` | No (public) |
| Trade | 🔄 Arrows | Opens Global Trade Sheet | Yes |
| Watchlist | 👁 Eye | `/watchlist` | Yes |
| Portfolio | 👤 Person | `/portfolio` | Yes |

```
DESKTOP (≥ 1024 px) — Left Sidebar Rail
┌───────────────┐
│ 🔮 FoTell      │   ← logo / wordmark
│               │
│ 🏠  Home      │   ← active state example
│ 📈  Markets   │
│ 🔄  Trade     │
│ 👁  Watchlist │
│ 👤  Portfolio │
│               │
│ ─────────────  │
│ ⚙  Settings   │
│ 🛡  Admin     │   ← admin role only
│ 🚪  Sign Out  │
└───────────────┘
Rail: 64 px collapsed (icons only), 220 px on hover (icon + label).
```

---

## 1. Landing Page (`/`)

> The only public page without the app shell. Goal: convert visitors → registered users.

**Branch:** `feat/landing-page`
**Access:** Public

```
┌──────────────────────────────────────────────────────────────────┐
│  NAVBAR (minimal)                                                │
│  [🔮 FoTell]                          [Log In]  [Sign Up →]     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  HERO (full-width, dark bg + subtle grid pattern)                │
│                                                                  │
│   Predict the Future.          ← display-xl, white              │
│   Trade What You Know.         ← display-xl, accent-blue        │
│                                                                  │
│   Binary prediction markets powered by LSMR AMM.                │
│   Start with 5,000 KES free play money.                          │
│                                                                  │
│   [  Get Started — Free  ]   [ Browse Markets → ]               │
│     ↑ Primary CTA               ↑ Ghost button                  │
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│   │ 142      │  │ KES 2.4M │  │  98.7%   │                      │
│   │ Markets  │  │ Volume   │  │ Accuracy │                      │
│   └──────────┘  └──────────┘  └──────────┘                      │
│   ↑ Stats strip (animated counters)                              │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  FEATURED MARKETS (3-col desktop, horizontal scroll mobile)     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ [OPEN]          │  │ [OPEN]          │  │ [CLOSED]        │  │
│  │ Will BTC reach  │  │ Will Kenya 2026 │  │ Will Musk tweet │  │
│  │ $100k by March? │  │ GDP > 6%?       │  │ about X today?  │  │
│  │ YES  ██░░  62%  │  │ YES  ████  71%  │  │ YES  ██████ 88% │  │
│  │ NO        38%   │  │ NO        29%   │  │ NO         12%  │  │
│  │ Vol: 45K KES    │  │ Vol: 120K KES   │  │ Vol: 8K KES     │  │
│  │ [Trade Now]     │  │ [Trade Now]     │  │ [View Result]   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  HOW IT WORKS                                                    │
│   1. Register        2. Browse Markets      3. Trade & Win       │
│   Get 5K KES free    Find events you know   Buy YES/NO shares,   │
│   play money         about                  earn on correct calls│
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  FOOTER                                                          │
│  FoTell © 2026   |  Markets  |  API Docs  |  GitHub  |  Contact │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Pages (`/auth/login`, `/auth/register`)

**Branch:** `feat/auth`

### 2a. Login

```
┌──────────────────────────────────────────────────────────────────┐
│               ┌─────────────────────────────┐                   │
│               │  🔮 FoTell                   │                   │
│               │  Welcome back                │                   │
│               │  Sign in to your account     │                   │
│               │                             │                   │
│               │  Email                      │                   │
│               │  < alice@example.com      > │                   │
│               │                             │                   │
│               │  Password                   │                   │
│               │  < ••••••••••••••••••    👁 > │                  │
│               │                             │                   │
│               │      Forgot password?        │                   │
│               │                             │                   │
│               │  [    Sign In    ]            │  ← Primary CTA   │
│               │                             │                   │
│               │  ─────────── or ───────────  │                   │
│               │  Don't have an account?      │                   │
│               │  Sign up →                   │                   │
│               └─────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2b. Register

```
               ┌─────────────────────────────┐
               │  🔮 FoTell                   │
               │  Create your account         │
               │  Start with 5,000 KES free   │
               │                             │
               │  Full Name                  │
               │  < Alice Johnson          > │
               │                             │
               │  Username                   │
               │  < alice_trader           > │
               │                             │
               │  Email                      │
               │  < alice@example.com      > │
               │                             │
               │  Password                   │
               │  < ••••••••••••••••••    👁 > │
               │  ✓ 8+ chars  ✓ Has number    │
               │                             │
               │  [    Create Account   ]    │
               │                             │
               │  Already have an account?   │
               │  Sign in →                  │
               └─────────────────────────────┘
```

**Notes:**
- Inline real-time validation; username availability check on blur (debounced)
- Error messages appear below failing field in `#f44336`
- On success → redirect to `/home` with welcome toast

---

## 3. Home Feed (`/home`)

**Branch:** `feat/dashboard`
**Access:** Authenticated
**Purpose:** Single-screen activity feed — open positions, open orders, recent activity, trending markets.

```
MOBILE (375 px)
┌──────────────────────────────────────────────────────────────────┐
│  Good morning, Alice 👋                          [🔔 2]          │
│                                    ↑ greeting    ↑ unread alerts │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACCOUNT SNAPSHOT  (horizontal scroll, 3 stat chips)            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │ Cash Balance  │  │ Portfolio Val │  │ Daily P&L     │        │
│  │ KES 4,500     │  │ KES   748     │  │ +KES 68       │        │
│  │               │  │               │  │ ▲ +10.0%      │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OPEN POSITIONS  — 3 open                        [View All →]   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Will BTC reach $100k?                                    │   │
│  │ YES × 100 shares  ·  Cost KES 62.50                      │   │
│  │ Current KES 68.00   Unreal. P&L  +KES 5.50 ▲            │   │
│  │ YES  ████████████░░  68.0¢                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Will Kenya GDP > 6%?                                     │   │
│  │ NO × 50 shares  ·  Cost KES 14.50                        │   │
│  │ Current KES 14.50   Unreal. P&L  ±0 →                   │   │
│  │ NO   █████░░░░░░░  29.0¢                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OPEN ORDERS  — 1 limit order pending             [View All →]  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [LIMIT] [PENDING]  Will ETH flip BTC?                    │   │
│  │ Buy YES · 200 shares · Trigger ≤ 42.0¢                   │   │
│  │ Placed Feb 24  ·  Expires Feb 25            [Cancel]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  (Section hidden if user has no open orders)                    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RECENT ACTIVITY                                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🟢 Feb 24 10:32   Bought 100 YES — BTC $100k             │   │
│  │    KES 62.50 spent · new YES price 63.1¢                 │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ 🔵 Feb 23 14:11   Bought 50 NO — Kenya GDP               │   │
│  │    KES 14.50 spent                                       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ ✅ Feb 22 09:00   Market Resolved — BTC Q4 → YES         │   │
│  │    Payout received: +KES 240                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                          [View All Activity →]  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRENDING MARKETS                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [OPEN]  Will Ruto win re-election?                       │   │
│  │ YES ██████░░  58.0¢   Vol: KES 95K            [Trade]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                            [Browse Markets →]   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  🏠 ●     📈        🔄        👁        👤                        │
│  Home   Markets   Trade   Watchlist Portfolio                    │
└──────────────────────────────────────────────────────────────────┘
```

**Component Notes:**
- Account snapshot chips scroll horizontally; tapping any chip deep-links to Portfolio tab
- "Open Orders" section only shown when user has ≥ 1 pending order
- Activity feed: newest-first, 10 items, "load more" pagination
- Trending section: top-3 markets by 24 h volume

---

## 4. Markets List (`/markets`)

**Branch:** `feat/markets-list`
**Access:** Public

```
┌──────────────────────────────────────────────────────────────────┐
│  [🔍 Search markets...                              ]            │
│  Status: [ALL] [OPEN] [PENDING] [CLOSED] [RESOLVED]             │
│  Sort:   [Newest ▾]    [Volume ▾]    [Closing Soon ▾]           │
└──────────────────────────────────────────────────────────────────┘

MARKET LIST (1-col mobile, 2-col desktop)

┌──────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [OPEN]                              Closes Mar 1 2026    │   │
│  │ Will Bitcoin reach $100k by end of March 2026?           │   │
│  │                                                          │   │
│  │  YES  ████████████░░░░  62.5¢                            │   │
│  │  NO   ░░░░░░░░░░░░████  37.5¢                            │   │
│  │                                                          │   │
│  │  Vol: KES 45,230  ·  Trades: 234  ·  👁 Watch            │   │
│  │                               [Trade Now →]              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [OPEN]                              Closes Apr 1 2026    │   │
│  │ Will Kenya GDP exceed 6% in 2026?                        │   │
│  │  YES  ████████████████░░  71.0¢                          │   │
│  │  NO   ░░░░░░░░░░░░░░░███  29.0¢                          │   │
│  │  Vol: KES 120,500  ·  Trades: 891  ·  👁 Watch           │   │
│  │                               [Trade Now →]              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│                       [ Load More ]                             │
└──────────────────────────────────────────────────────────────────┘
```

**Component Notes:**
- Clicking card → `/markets/:id`
- 👁 Watch icon toggles watchlist membership (auth-gated: shows login toast if guest)
- Pagination: `limit`/`offset`; "Load More" increments offset

---

## 5. Market Detail (`/markets/[id]`)

**Branch:** `feat/market-detail`
**Access:** Public (trading requires auth)

```
MOBILE — stacked layout
┌──────────────────────────────────────────────────────────────────┐
│  ← Back    Will Bitcoin reach $100k by March?       👁 Watch    │
├──────────────────────────────────────────────────────────────────┤
│  [OPEN]                               Closes Mar 1 2026          │
│  Market resolves YES if BTC/USD ≥ 100,000 on any major exchange. │
├──────────────────────────────────────────────────────────────────┤
│  CURRENT PRICES                                                  │
│  ┌────────────────────┐    ┌────────────────────┐               │
│  │ YES         62.5¢  │    │ NO          37.5¢  │               │
│  │ ▲ +3.2% today      │    │ ▼ -3.2% today      │               │
│  └────────────────────┘    └────────────────────┘               │
├──────────────────────────────────────────────────────────────────┤
│  PRICE CHART   [24h] [7d] [30d] [ALL]                            │
│  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     │
│  100% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                │
│   75% ─            ╭╮                                           │
│   50% ─  ──────────╯╰────                                       │
│   25% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                │
│    0% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                │
│       Feb 17   Feb 19   Feb 21   Feb 24                          │
├──────────────────────────────────────────────────────────────────┤
│  STATS: Volume KES 45,230  ·  Trades 234  ·  Liquidity b 500    │
├──────────────────────────────────────────────────────────────────┤
│  RECENT TRADES                                                   │
│  10:32 AM   YES  100 shares  62.1¢                               │
│  10:28 AM   NO    50 shares  37.9¢                               │
│  …  (50 most recent, scrollable)                                 │
└──────────────────────────────────────────────────────────────────┘

─────── TRADE PANEL (sticky bottom sheet on mobile) ───────────────

STEP 1 — Select order type via tabs:
┌──────────────────────────────────────────────────────────────────┐
│  ▼  (drag handle)                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [  Market Order  ]   [  Limit Order  ]  ← order tabs   │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  ── MARKET ORDER ──                                     │    │
│  │  Outcome:  [  YES  ]  [  NO  ]                          │    │
│  │  Shares:   < 100                                     >  │    │
│  │  Est. Cost KES 62.50                                    │    │
│  │  Max Slip: < 5%                                      >  │    │
│  │  Balance:  KES 4,500                                    │    │
│  │                                                         │    │
│  │  [      Buy YES Shares — KES 62.50      ]               │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  ── LIMIT ORDER (when "Limit Order" tab selected) ──            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Outcome:       [  YES  ]  [  NO  ]                     │    │
│  │  Shares:        < 200                               >   │    │
│  │  Trigger Price: < 42.0¢ ≤ current YES price         >   │    │
│  │  ℹ Order executes when YES price drops to ≤ 42.0¢.     │    │
│  │                                                         │    │
│  │  Est. Max Cost  KES 84.00                               │    │
│  │  Expires:       [1h] [24h] [7d] [GTC]   ← pill toggle  │    │
│  │  Balance:       KES 4,500                               │    │
│  │                                                         │    │
│  │  [ Place Limit Order — 200 YES @ ≤ 42¢ ]               │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

Note: Unauthenticated users see:
  [ Log in to Trade ]   ← replaces entire panel

DESKTOP (≥ 1024 px) — side-by-side:
┌─────────────────────────────────────┬────────────────────────────┐
│  LEFT — Market Info (65%)           │  RIGHT — Trade Card (35%)  │
│  (same content as mobile above)     │  (same panels, as a card)  │
└─────────────────────────────────────┴────────────────────────────┘
```

---

## 6. Trade Execution Confirmations & Receipts

**Branch:** `feat/trade-execution`
**Access:** Authenticated

### 6a. Market Order Confirmation Modal

```
┌─────────────────────────────────────────────────────┐
│  ╳                   Confirm Market Order            │
│  ─────────────────────────────────────────────────  │
│  Market:   Will BTC reach $100k by March?            │
│  Side:     YES  ← green badge                        │
│  Type:     MARKET                                    │
│  Shares:   100                                       │
│  Price:    62.5¢ per share (at submission)           │
│                                                     │
│  Estimated Cost      KES  62.50                      │
│  Max Slippage Guard  KES  65.63  (+5%)               │
│  Current Balance     KES 4,500.00                    │
│  Balance After       KES 4,437.50                    │
│                                                     │
│  ⚠ Prices may move by execution time.                │
│    Trade fails if cost exceeds KES 65.63.            │
│                                                     │
│  [    Cancel    ]      [  Confirm & Buy  ]            │
│   ↑ ghost                ↑ accent-blue              │
└─────────────────────────────────────────────────────┘
```

### 6b. Limit Order Confirmation Modal

```
┌─────────────────────────────────────────────────────┐
│  ╳                   Confirm Limit Order             │
│  ─────────────────────────────────────────────────  │
│  Market:         Will ETH flip BTC?                  │
│  Side:           YES  ← green badge                  │
│  Type:           LIMIT                               │
│  Shares:         200                                 │
│  Trigger Price:  ≤ 42.0¢                             │
│  Max Cost:       KES 84.00                           │
│  Expires:        24 hours                            │
│                                                     │
│  ℹ This order executes automatically when YES        │
│    price reaches 42.0¢ or below.                     │
│    Funds are NOT reserved — your balance must        │
│    cover the cost at fill time.                      │
│                                                     │
│  [    Cancel    ]      [  Place Limit Order  ]        │
└─────────────────────────────────────────────────────┘
```

### 6c. Post-Trade State Screens

```
SUCCESS — Market Order:
┌──────────────────────────────────────────────────┐
│  ✅  Trade Executed!                              │
│  Bought 100 YES shares for KES 62.50             │
│  New price: YES 63.1¢  /  NO 36.9¢               │
│  New balance: KES 4,437.50                        │
│  [  View Portfolio  ]   [ Trade Again ]           │
└──────────────────────────────────────────────────┘

SUCCESS — Limit Order placed:
┌──────────────────────────────────────────────────┐
│  ✅  Limit Order Placed!                          │
│  200 YES shares @ ≤ 42.0¢  ·  expires in 24h     │
│  You'll be notified when the order fills.         │
│  [  View Orders  ]   [ Trade Again ]              │
└──────────────────────────────────────────────────┘

SLIPPAGE EXCEEDED:
┌──────────────────────────────────────────────────┐
│  ❌  Trade Rejected — Slippage Exceeded           │
│  Projected cost KES 68.50 exceeded your          │
│  max of KES 65.63. No changes were made.          │
│  [  Adjust Max Slippage  ]   [ Close ]            │
└──────────────────────────────────────────────────┘
```

---

## 7. Watchlist (`/watchlist`)

**Branch:** `feat/dashboard` (Watchlist sub-feature)
**Access:** Authenticated
**Purpose:** Monitor starred markets; set and manage price alerts.

```
MOBILE
┌──────────────────────────────────────────────────────────────────┐
│  Watchlist                               [+ Add Market]          │
│  [All Markets ▾]   [🔔 Alerts Only]                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [OPEN]  Will Bitcoin reach $100k by March?               │   │
│  │                                                          │   │
│  │  YES  ██████████░░  62.5¢   ▲ +3.2%  (today)            │   │
│  │  NO               37.5¢   ▼ -3.2%                      │   │
│  │                                                          │   │
│  │  Vol 24h: KES 12,400       Closes: Mar 1                │   │
│  │  🔔 Alert: YES ≥ 70¢                                     │   │
│  │                                                          │   │
│  │  [Trade]   [🔔 Edit Alert]   [✕ Remove]                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [OPEN]  Will Kenya GDP exceed 6%?                        │   │
│  │  YES  █████████████░  71.0¢   ▲ +1.0%                   │   │
│  │  NO              29.0¢                                   │   │
│  │  Vol 24h: KES 4,200          Closes: Apr 1              │   │
│  │  🔔 No alert set                                         │   │
│  │  [Trade]   [🔔 Set Alert]   [✕ Remove]                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── Empty State ──────────────────────────────────────────      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   👁                                                     │   │
│  │   You haven't watched any markets yet.                   │   │
│  │   Browse markets and tap 👁 to add them here.            │   │
│  │   [  Browse Markets  ]                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  🏠       📈        🔄        👁 ●      👤                        │
│  Home   Markets   Trade   Watchlist  Portfolio                   │
└──────────────────────────────────────────────────────────────────┘
```

### Price Alert Bottom Sheet

```
┌──────────────────────────────────────────────────────────────────┐
│  ▼  Set Price Alert                                              │
│  Market: Will BTC reach $100k by March?                          │
│                                                                  │
│  Alert me when:                                                  │
│  [ YES price ▾ ]  [ ≥ ▾ ]  < 70 >  ¢                           │
│                                                                  │
│  Notify via:                                                     │
│  ☑ In-app notification                                           │
│  ☐ Email                                                         │
│                                                                  │
│  [  Cancel  ]            [  Save Alert  ]                        │
└──────────────────────────────────────────────────────────────────┘
```

**Component Notes:**
- Alert operators: `≥` (price rises to), `≤` (price falls to)
- Alerts can be set for YES price or NO price
- Multiple alerts per market are allowed
- Triggered alerts auto-dismiss after 24h or until user dismisses

---

## 8. Portfolio (`/portfolio`)

**Branch:** `feat/portfolio`
**Access:** Authenticated
**Reference:** IBKR ForecastTrader portfolio screen — stats bar + 4 tabs.

```
MOBILE
┌──────────────────────────────────────────────────────────────────┐
│  Portfolio                                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IBKR-STYLE STATS BAR  (horizontal scroll chips)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Unrealized P&L  Realized P&L   Market Val  Buying Power │   │
│  │  +KES 68         +KES 240       KES 748     KES 4,500    │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  Daily P&L       Total Cash     Open Orders              │   │
│  │  +KES 68         KES 4,500      1 pending                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ↑ Tap any chip for tooltip definition                           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [Positions]   [Balances]   [Orders]   [History]  ← tab nav      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ── POSITIONS TAB ─────────────────────────────────────────     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Will BTC reach $100k?                                    │   │
│  │ Side: YES  ·  Shares: 100  ·  Cost basis: KES 62.50      │   │
│  │ Cur. value: KES 68.00  ·  Unreal. P&L: +KES 5.50 ▲      │   │
│  │ YES  ████████████░░  68.0¢                               │   │
│  │ [View Market]   [Trade More]   [Close Position]          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Will Kenya GDP > 6%?                                     │   │
│  │ Side: NO  ·  Shares: 50  ·  Cost basis: KES 14.50        │   │
│  │ Cur. value: KES 14.50  ·  Unreal. P&L: ±0 →             │   │
│  │ NO   ████░░░░░░░░  29.0¢                                 │   │
│  │ [View Market]   [Trade More]   [Close Position]          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── BALANCES TAB ──────────────────────────────────────────     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Cash Balance          KES 4,500.00                      │   │
│  │  Positions Value       KES   748.00                      │   │
│  │  ─────────────────────────────────────                   │   │
│  │  Total Account Value   KES 5,248.00                      │   │
│  │                                                          │   │
│  │  Realized P&L (all-time)   +KES 240.00                   │   │
│  │  Unrealized P&L             +KES  68.00                  │   │
│  │  Total P&L                  +KES 308.00                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── ORDERS TAB ────────────────────────────────────────────     │
│                                                                  │
│  Filter: [Open ●]  [Filled]  [Cancelled]                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [LIMIT] [PENDING]                                       │   │
│  │  Will ETH flip BTC?                                      │   │
│  │  Buy YES · 200 shares · Trigger ≤ 42.0¢                  │   │
│  │  Placed Feb 24 11:00   ·   Expires Feb 25 11:00          │   │
│  │                                        [Cancel Order]    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Filled sub-tab:                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [LIMIT] [FILLED]                                        │   │
│  │  Will BTC reach $100k?                                   │   │
│  │  Bought YES · 100 shares @ 62.5¢ · KES 62.50            │   │
│  │  Placed Feb 24 09:00   ·   Filled Feb 24 10:32           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── HISTORY TAB ───────────────────────────────────────────     │
│                                                                  │
│  Date/Time        │ Market        │ Side │ Shares │ Cost  │ Type │
│  ─────────────────────────────────────────────────────────────  │
│  Feb 24 10:32 AM  │ BTC $100k     │ YES  │ 100    │ 62.50 │ MKT  │
│  Feb 23 14:11 PM  │ Kenya GDP     │ NO   │  50    │ 14.50 │ MKT  │
│  Feb 22 09:00 AM  │ BTC Q4 (Res.) │ YES  │ 500    │ 200   │ MKT  │
│  …                                                               │
│  [← Prev]    Page 1 of 3    [Next →]                            │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  🏠       📈        🔄        👁        👤 ●                       │
│  Home   Markets   Trade   Watchlist  Portfolio                   │
└──────────────────────────────────────────────────────────────────┘
```

**Component Notes:**
- Stats bar: horizontal scroll, chips with label + value; tap shows tooltip with definition
- "Close Position" pre-fills Trade Panel: opposite side, same shares → market order flow
- Orders tab: defaults to "Open"; filter pills switch to Filled / Cancelled
- History: sortable by Date (default), Market, Cost; 50 rows/page

---

## 9. Orders Management Detail (`/portfolio?tab=orders`)

> Full-screen orders list, accessible from Portfolio "Orders" tab or Home "Open Orders" link.

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Portfolio      Orders                                         │
│  [Open ●] [Filled] [Cancelled]         [Filter ▾]  [Sort ▾]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OPEN ORDERS (1)                                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Order #4f8a                        [LIMIT]  [PENDING]   │   │
│  │  Will ETH flip BTC?                                      │   │
│  │                                                          │   │
│  │  Direction:      BUY YES                                 │   │
│  │  Shares:         200                                     │   │
│  │  Trigger Price:  YES ≤ 42.0¢  (current: 44.2¢)           │   │
│  │  Max Cost:       KES 84.00                               │   │
│  │  Placed:         Feb 24, 2026 at 11:00 AM                │   │
│  │  Expires:        Feb 25, 2026 at 11:00 AM                │   │
│  │                                                          │   │
│  │                         [Edit Trigger]  [Cancel Order]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── Empty State ──────────────────────────────────────────      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   🔄                                                     │   │
│  │   No open orders.                                        │   │
│  │   Place a limit order from any Market Detail page.       │   │
│  │   [  Browse Markets  ]                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

── Inline Cancel Confirmation (replaces card footer) ─────────────
  ┌──────────────────────────────────────────────────────────┐
  │  ⚠ Cancel this limit order?                              │
  │  This action cannot be undone.                           │
  │  [  Keep Order  ]          [  Yes, Cancel  ]  ← danger   │
  └──────────────────────────────────────────────────────────┘
```

---

## 10. Global Trade Sheet (accessible from Trade tab, any page)

```
┌──────────────────────────────────────────────────────────────────┐
│  ╳   Trade                                                       │
│  [🔍 Search markets to trade…                               ]   │
│                                                                  │
│  Recently Viewed:                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Will BTC reach $100k?   YES 62.5¢  NO 37.5¢   [Select]  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  (After selecting a market, the full Trade Panel from §5        │
│   renders below — Market Order / Limit Order tabs)              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 11. Create Market (`/admin/markets/create`)

**Branch:** `feat/create-market`
**Access:** Admin only

```
┌──────────────────────────────────────────────────────────────────┐
│  Create New Market                                               │
│  ●─────────────○─────────────○                                   │
│  1 Question    2 Params      3 Review                            │
└──────────────────────────────────────────────────────────────────┘

STEP 1 — Question
┌──────────────────────────────────────────────────────────────────┐
│  Market Question *                                               │
│  < Will Bitcoin reach $100k by end of March 2026?             > │
│  46/500                                                          │
│                                                                  │
│  Description (optional)                                          │
│  < Market resolves YES if BTC/USD ≥ 100,000 on any exchange… >  │
│                                             [ Next → ]          │
└──────────────────────────────────────────────────────────────────┘

STEP 2 — Parameters
┌──────────────────────────────────────────────────────────────────┐
│  Closes At *                                                     │
│  < 2026-03-01T00:00  🗓 >                                        │
│                                                                  │
│  Liquidity Parameter (b) *                                       │
│  < 500                                                        >  │
│  ℹ Recommended: 100–1000. Higher b = lower price impact.        │
│                                                                  │
│  [ ← Back ]                              [ Next → ]             │
└──────────────────────────────────────────────────────────────────┘

STEP 3 — Review & Publish
┌──────────────────────────────────────────────────────────────────┐
│  Question:   Will Bitcoin reach $100k by end of March 2026?     │
│  Closes:     March 1, 2026 00:00 UTC                             │
│  Liquidity:  b = 500                                             │
│  Status:     PENDING (open trading from Admin panel)            │
│                                                                  │
│  [ ← Back ]                    [  Create Market  ]              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. Admin Market Management (`/admin`)

**Branch:** `feat/admin`
**Access:** Admin only

```
┌──────────────────────────────────────────────────────────────────┐
│  Admin Panel                           [+ Create Market]        │
├──────────────────────────────────────────────────────────────────┤
│  Market              │ Status    │ Volume   │ Trades │ Actions   │
│  ────────────────────────────────────────────────────────────── │
│  Will BTC reach $100k│ [OPEN]    │ KES 45K  │ 234    │[⏸ Close] │
│  Will Kenya GDP > 6% │ [OPEN]    │ KES 120K │ 891    │[⏸ Close] │
│  Will Musk tweet…?   │ [CLOSED]  │ KES 8K   │  56    │[✓ Resolve│
│  Will ETH flip BTC?  │ [PENDING] │ —        │   0    │[▶ Open]  │
└──────────────────────────────────────────────────────────────────┘

RESOLVE MODAL:
┌──────────────────────────────────────────────────────────────────┐
│  Resolve: "Will Musk tweet…?"                                    │
│  Select Outcome:                                                 │
│  ( ) YES — pays out YES shareholders                             │
│  ( ) NO  — pays out NO shareholders                              │
│  ⚠ This action is IRREVERSIBLE.                                  │
│  [  Cancel  ]              [  Resolve Market  ]  ← danger btn   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 13. Responsive Breakpoints

| Breakpoint | Min Width | Layout Changes |
|---|---|---|
| `sm` | 640 px | — |
| `md` | 768 px | 2-col market grid |
| `lg` | 1024 px | Bottom nav → top navbar + left sidebar rail |
| `xl` | 1280 px | Wider containers, side-by-side Market Detail |
| `2xl` | 1536 px | Max content width cap at 1400 px |

---

## 14. Loading & Error States

Every data-driven screen implements:

```
[Loading] → Full-layout skeleton (never spinners alone)
[Error]   → Inline error card: icon + message + [Retry] button
[Empty]   → Contextual empty state with primary CTA (see per-screen above)
[Offline] → Top banner: "You're offline. Some data may be stale."
```

Per-screen empty state CTAs:

| Screen | Empty State Message | CTA |
|---|---|---|
| Home — Positions | "No open positions yet." | Browse Markets |
| Home — Orders | "No open orders." | Browse Markets |
| Watchlist | "No markets on your watchlist." | Browse Markets |
| Portfolio — Positions | "No open positions." | Browse Markets |
| Portfolio — Orders | "No open orders. Place a limit order." | Browse Markets |
| Portfolio — History | "No trade history yet." | Browse Markets |

---

## 15. Toast / Notification System

Global toast (top-right desktop, top-center mobile, auto-dismiss 4s):

| Event | Type | Message |
|---|---|---|
| Login success | success | "Welcome back, {username}!" |
| Register success | success | "Account created! You have 5,000 KES to start." |
| Market order success | success | "Bought {n} {YES/NO} shares for KES {cost}" |
| Limit order placed | success | "Limit order placed: {n} {side} @ ≤{price}¢" |
| Limit order filled | success | "Your limit order filled: {n} {side} @ {price}¢" |
| Limit order expired | info | "Limit order expired unfilled." |
| Order cancelled | info | "Limit order cancelled." |
| Trade slippage | error | "Trade rejected: price moved too much." |
| Market created | success | "Market created (PENDING). Open it to allow trading." |
| Market resolved | info | "Market resolved: {outcome}. Payouts sent." |
| Watchlist added | info | "Added to Watchlist." |
| Watchlist removed | info | "Removed from Watchlist." |
| Alert triggered | warning | "🔔 Alert: {market} YES price hit {price}¢" |
| Network error | error | "Connection lost. Check your internet." |
| Session expired | warning | "Session expired. Please log in again." |
