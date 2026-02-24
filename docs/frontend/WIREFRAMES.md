# Wireframes & Layout Specifications

> Annotated ASCII wireframes and detailed layout specs for every page view.

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
```

---

## 1. Landing Page (`/`)

**Branch:** `feat/landing-page`  
**Route:** Public — no auth required  
**Goal:** Convert visitors → registered users; showcase what FoTell is.

```
┌──────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                          │
│  [🔮 FoTell]          [Markets]  [How It Works]  [Docs]         │
│                                        [Log In]  [Sign Up →]    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  HERO SECTION (full-width, dark bg + subtle grid pattern)        │
│                                                                  │
│   Predict the Future.          ← display-xl, white              │
│   Trade What You Know.         ← display-xl, accent-blue        │
│                                                                  │
│   Binary prediction markets powered by LSMR AMM.               │
│   Start with 5,000 KES free play money.                         │
│                                                                  │
│   [  Get Started — Free  ]   [ Browse Markets → ]               │
│     ↑ Primary CTA                ↑ Ghost button                 │
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│   │ 142      │  │ KES 2.4M │  │  98.7%   │                      │
│   │ Markets  │  │ Volume   │  │ Accuracy │                      │
│   └──────────┘  └──────────┘  └──────────┘                      │
│   ↑ Stats strip (animated counters)                             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  FEATURED MARKETS (horizontal scroll on mobile, 3-col desktop)  │
│                                                                  │
│  Trending Now ↗                              [View All Markets]  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ [OPEN]          │  │ [OPEN]          │  │ [CLOSED]        │  │
│  │ Will BTC reach  │  │ Will Kenya 2026 │  │ Will Musk tweet │  │
│  │ $100k by March? │  │ GDP > 6%?       │  │ about X today?  │  │
│  │                 │  │                 │  │                 │  │
│  │ YES  ██░░  62%  │  │ YES  ████  71%  │  │ YES  ██████ 88% │  │
│  │ NO        38%   │  │ NO        29%   │  │ NO         12%  │  │
│  │                 │  │                 │  │                 │  │
│  │ Vol: 45K KES    │  │ Vol: 120K KES   │  │ Vol: 8K KES     │  │
│  │ 234 trades      │  │ 891 trades      │  │ 56 trades       │  │
│  │                 │  │                 │  │                 │  │
│  │ [Trade Now]     │  │ [Trade Now]     │  │ [View Result]   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  HOW IT WORKS (3 steps)                                          │
│                                                                  │
│   1. Register        2. Browse Markets      3. Trade & Win       │
│   Get 5K KES free    Find events you know   Buy YES or NO shares │
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

### 2a. Login Page

```
┌──────────────────────────────────────────────────────────────────┐
│  NAVBAR (minimal — logo + "Back to Markets" ghost link)          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  (bg-base, centered content)                     │
│                                                                  │
│               ┌─────────────────────────────┐                   │
│               │  🔮 FoTell                   │  ← Card           │
│               │                             │                   │
│               │  Welcome back               │                   │
│               │  Sign in to your account    │                   │
│               │                             │                   │
│               │  Email                      │                   │
│               │  < alice@example.com      > │                   │
│               │                             │                   │
│               │  Password                   │                   │
│               │  < ••••••••••••••••••    👁 > │                   │
│               │                             │                   │
│               │      Forgot password?       │                   │
│               │                             │                   │
│               │  [    Sign In    ]           │  ← Primary CTA    │
│               │                             │                   │
│               │  ─────────── or ──────────  │                   │
│               │                             │                   │
│               │  Don't have an account?     │                   │
│               │  Sign up →                  │                   │
│               └─────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2b. Register Page

```
               ┌─────────────────────────────┐
               │  🔮 FoTell                   │
               │                             │
               │  Create your account        │
               │  Start with 5,000 KES free  │
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
               │  ✓ 8+ chars  ✓ Has number   │
               │                             │
               │  [    Create Account   ]    │
               │                             │
               │  Already have an account?   │
               │  Sign in →                  │
               └─────────────────────────────┘
```

**Component Notes:**
- Show inline real-time validation (username availability check on blur via debounce)
- Error messages appear immediately below the failing field in `#f44336`
- On success → redirect to `/dashboard` with welcome toast

---

## 3. Markets List (`/markets`)

**Branch:** `feat/markets-list`  
**Access:** Public

```
┌──────────────────────────────────────────────────────────────────┐
│  NAVBAR (full authenticated or guest state)                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  PAGE HEADER                                                     │
│  Markets                         [+ Create Market]  ← admin only│
│  Discover and trade on real-world outcomes                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  FILTER / SEARCH BAR                                             │
│                                                                  │
│  [🔍 Search markets...          ]  [All ▾]  [Newest ▾]          │
│                                    ↑ Status  ↑ Sort             │
│                                                                  │
│  Filter chips: [ALL] [OPEN] [PENDING] [CLOSED] [RESOLVED]       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  MARKET GRID  (2-col desktop, 1-col mobile)                      │
│                                                                  │
│  ┌───────────────────────────────────┐                           │
│  │ [OPEN]                 Closes Mar 1│  ← MarketCard            │
│  │                                   │                           │
│  │ Will Bitcoin reach $100k by       │                           │
│  │ end of March 2026?                │                           │
│  │                                   │                           │
│  │  YES  ████████████░░░░░  62.5¢    │  ← Probability bar       │
│  │  NO   ░░░░░░░░░░░░████   37.5¢    │                           │
│  │                                   │                           │
│  │  Vol: KES 45,230  │  Trades: 234  │                           │
│  └───────────────────────────────────┘                           │
│                                                                  │
│  ┌───────────────────────────────────┐                           │
│  │ [OPEN]                 Closes Apr 1│                           │
│  │ Will Kenya GDP exceed 6% in 2026? │                           │
│  │  YES  ████████████████░░  71.0¢   │                           │
│  │  NO   ░░░░░░░░░░░░░░░███  29.0¢   │                           │
│  │  Vol: KES 120,500 │  Trades: 891  │                           │
│  └───────────────────────────────────┘                           │
│                                                                  │
│                    [ Load More ]                                 │
└──────────────────────────────────────────────────────────────────┘
```

**Component Notes:**
- `MarketCard` is the primary reusable unit
- Clicking anywhere on card → `/markets/:id`
- "Create Market" button only visible when `user.role === 'ADMIN'`
- Pagination via `limit`/`offset` params; "Load More" triggers offset increment

---

## 4. Market Detail (`/markets/[id]`)

**Branch:** `feat/market-detail`  
**Access:** Public (trading requires auth)

```
┌──────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                          │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┬────────────────────────────┐
│  LEFT — Market Info (2/3 width)     │  RIGHT — Trade Panel (1/3) │
│                                     │                            │
│  ← Back to Markets                  │  ┌──────────────────────┐  │
│                                     │  │  Place Trade         │  │
│  [OPEN]     Closes Mar 1 2026       │  │                      │  │
│                                     │  │  [  YES  ]  [  NO  ] │  │
│  Will Bitcoin reach $100k           │  │   ↑ toggle tab       │  │
│  by end of March 2026?              │  │                      │  │
│                                     │  │  Shares              │  │
│  Market resolves YES if BTC/USD     │  │  < 100             > │  │
│  ≥ 100,000 on any major exchange    │  │  +/-  buttons        │  │
│  at any point before close.         │  │                      │  │
│                                     │  │  Estimated Cost      │  │
│  ───────────────────────────────    │  │  KES 62.50           │  │
│                                     │  │                      │  │
│  PRICE CHART  (7d probability)      │  │  Max Slippage        │  │
│                                     │  │  < 5%              > │  │
│  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│  │                      │  │
│  100% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  │  [  Buy YES Shares ] │  │
│   75% ─            ╭╮              ─│  │   ↑ YES variant btn  │  │
│   50% ─  ──────────╯╰────          ─│  │                      │  │
│   25% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  │  ─ ─ ─ ─ ─ ─ ─ ─ ─  │  │
│    0% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  │  Balance: KES 4,500  │  │
│       Feb 17  Feb 19  Feb 21  Feb 24│  │  Your YES shares: 0  │  │
│                                     │  └──────────────────────┘  │
│  ─────────────────────────────────  │                            │
│                                     │                            │
│  CURRENT PRICES                     │                            │
│  ┌───────────┐    ┌───────────┐     │                            │
│  │ YES  62.5¢│    │ NO   37.5¢│     │                            │
│  │ ↑ +3.2%   │    │ ↓ -3.2%   │     │                            │
│  └───────────┘    └───────────┘     │                            │
│                                     │                            │
│  STATS                              │                            │
│  Volume: KES 45,230                 │                            │
│  Total Trades: 234                  │                            │
│  Liquidity Param: 500               │                            │
│                                     │                            │
│  ─────────────────────────────────  │                            │
│                                     │                            │
│  TRADE HISTORY (public — own only)  │                            │
│  Time       Side  Shares  Price     │                            │
│  10:32 AM   YES   100     62.1¢     │                            │
│  10:28 AM   NO    50      37.9¢     │                            │
│  …                                  │                            │
└─────────────────────────────────────┴────────────────────────────┘
```

**Component Notes:**
- Trade Panel collapses to a bottom sheet on mobile (sticky CTA at bottom)
- Unauthenticated users see "Log in to Trade" button instead of the form
- Price chart uses `recharts` `AreaChart` — YES area is green-tinted, NO is red-tinted
- Trade history shows 50 most recent trades, scrollable

---

## 5. Trade Execution Confirmation Modal

**Branch:** `feat/trade-execution`  
**Access:** Authenticated  
**Trigger:** Clicking "Buy YES/NO Shares" in the Trade Panel

```
┌─────────────────────────────────────────────────────┐
│  ╳                     Confirm Trade                 │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Market:   Will BTC reach $100k by March?           │
│  Side:     YES  ← green badge                       │
│  Shares:   100                                      │
│  Price:    62.5¢ per share (at time of order)       │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Estimated Cost      KES 62.50                      │
│  Max Slippage Guard  KES 65.63  (+5%)               │
│  Current Balance     KES 4,500.00                   │
│  Balance After       KES 4,437.50                   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  ⚠  Prices may move slightly by execution time.     │
│     Trade will fail if cost exceeds KES 65.63.      │
│                                                     │
│  [    Cancel    ]      [  Confirm & Buy  ]           │
│   ↑ ghost button        ↑ accent-blue button        │
└─────────────────────────────────────────────────────┘
```

**Post-trade states:**

```
SUCCESS:
┌──────────────────────────────────────────────────┐
│  ✅ Trade Executed!                               │
│  You bought 100 YES shares for KES 62.50         │
│  New price: YES 63.1¢  /  NO 36.9¢               │
│  New balance: KES 4,437.50                        │
│  [  View Portfolio  ]   [ Trade Again ]           │
└──────────────────────────────────────────────────┘

SLIPPAGE EXCEEDED:
┌──────────────────────────────────────────────────┐
│  ❌ Trade Rejected — Slippage Exceeded            │
│  Projected cost KES 68.50 exceeded your          │
│  max of KES 65.63. No changes were made.         │
│  [  Adjust Max Slippage  ]   [ Close ]           │
└──────────────────────────────────────────────────┘
```

---

## 6. User Dashboard (`/dashboard`)

**Branch:** `feat/dashboard`  
**Access:** Authenticated

```
┌──────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Good morning, Alice! 👋                                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  STATS ROW  (4 stat cards, scrollable on mobile)                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│  │ Balance      │ │ Portfolio    │ │ Open         │ │ Total   │ │
│  │ KES 4,500    │ │ Value        │ │ Positions    │ │ PnL     │ │
│  │              │ │ KES 680      │ │ 3            │ │ +KES    │ │
│  │   ↑ primary  │ │   ↑ blue     │ │   ↑ neutral  │ │  180    │ │
│  │              │ │              │ │              │ │ ↑ green │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┬────────────────────────────────┐
│  OPEN POSITIONS (left 60%)      │  RECENT ACTIVITY (right 40%)   │
│                                 │                                │
│  ┌─────────────────────────┐    │  Feb 24  Bought 100 YES        │
│  │ Will BTC reach $100k?   │    │  BTC $100k  +KES 62.50         │
│  │ YES × 100 shares        │    │                                │
│  │ Cost basis: KES 62.50   │    │  Feb 23  Bought 50 NO          │
│  │ Current value: KES 68.0 │    │  Kenya GDP  +KES 14.50         │
│  │ Unrealized PnL: +KES5.5 │    │                                │
│  │ YES  ████████  68.0¢    │    │  Feb 22  Market Resolved ✅     │
│  │ [View Market]           │    │  BTC Q4  → YES  +KES 240       │
│  └─────────────────────────┘    │                                │
│                                 │  [View All Activity →]        │
│  ┌─────────────────────────┐    │                                │
│  │ Will Kenya GDP > 6%?    │    │                                │
│  │ NO × 50 shares          │    │                                │
│  │ Cost basis: KES 14.50   │    │                                │
│  │ Current value: KES 14.5 │    │                                │
│  │ Unrealized PnL:  ±0     │    │                                │
│  │ NO   ███░░░░░  29.0¢    │    │                                │
│  │ [View Market]           │    │                                │
│  └─────────────────────────┘    │                                │
│                                 │                                │
│  [Browse More Markets →]        │                                │
└─────────────────────────────────┴────────────────────────────────┘
```

---

## 7. Portfolio / Trade History (`/portfolio`)

**Branch:** `feat/portfolio`  
**Access:** Authenticated

```
┌──────────────────────────────────────────────────────────────────┐
│  Portfolio                                                       │
│                                                                  │
│  [Positions]   [Trade History]   [Resolved]   ← Tab nav         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  POSITIONS TAB                                                   │
│                                                                  │
│  Market                │ Side  │ Shares │ Cost   │ Value │ PnL   │
│  ─────────────────────────────────────────────────────────────  │
│  Will BTC reach $100k? │ YES   │ 100    │ 62.50  │ 68.00 │+5.50  │
│  Will Kenya GDP > 6%?  │ NO    │  50    │ 14.50  │ 14.50 │ 0.00  │
│                                                                  │
│  PnL column: green if positive, red if negative                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  TRADE HISTORY TAB                                               │
│                                                                  │
│  Date/Time       │ Market          │ Side │ Shares │ Cost  │ TxID│
│  ─────────────────────────────────────────────────────────────  │
│  Feb 24 10:32 AM │ BTC $100k       │ YES  │ 100    │ 62.50 │ … │
│  Feb 23 14:11 PM │ Kenya GDP       │ NO   │  50    │ 14.50 │ … │
│  …                                                               │
│                                                                  │
│  Pagination: 50 per page                                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Create Market (`/admin/markets/create`)

**Branch:** `feat/create-market`  
**Access:** Admin only

```
┌──────────────────────────────────────────────────────────────────┐
│  Create New Market                                               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  STEP WIZARD  ① Question → ② Parameters → ③ Review & Publish    │
│                                                                  │
│  ●─────────────○─────────────○                                   │
│  1             2             3                                   │
└──────────────────────────────────────────────────────────────────┘

STEP 1 — Question
┌──────────────────────────────────────────────────────────────────┐
│  Market Question *                                               │
│  < Will Bitcoin reach $100k by end of March 2026?             > │
│  Character count: 46/500                                         │
│                                                                  │
│  Description (optional)                                          │
│  < Market resolves YES if BTC/USD ≥ 100,000 on any            > │
│  < major exchange at any point before the close date.          > │
│                                                                  │
│                                        [ Next → ]               │
└──────────────────────────────────────────────────────────────────┘

STEP 2 — Parameters
┌──────────────────────────────────────────────────────────────────┐
│  Closes At *                                                     │
│  < 2026-03-01T00:00           🗓 >                               │
│                                                                  │
│  Liquidity Parameter (b) *                                       │
│  < 500                                                        >  │
│  ℹ Higher b = lower price impact per trade. Recommended: 100–1000│
│                                                                  │
│  [ ← Back ]                              [ Next → ]             │
└──────────────────────────────────────────────────────────────────┘

STEP 3 — Review & Publish
┌──────────────────────────────────────────────────────────────────┐
│  Review Your Market                                              │
│                                                                  │
│  Question:   Will Bitcoin reach $100k by end of March 2026?     │
│  Closes:     March 1, 2026 00:00 UTC                            │
│  Liquidity:  b = 500                                            │
│  Status:     PENDING (you must open trading separately)         │
│                                                                  │
│  [ ← Back ]                    [  Create Market  ] ← primary    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Admin Market Management (`/admin`)

**Branch:** `feat/admin`  
**Access:** Admin only

```
┌──────────────────────────────────────────────────────────────────┐
│  Admin Panel                           [+ Create Market]        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Market              │ Status    │ Volume   │ Trades │ Actions   │
│  ────────────────────────────────────────────────────────────── │
│  Will BTC reach $100k│ [OPEN]    │ KES 45K  │ 234    │[⏸ Close] │
│  Will Kenya GDP > 6% │ [OPEN]    │ KES 120K │ 891    │[⏸ Close] │
│  Will Musk tweet…?   │ [CLOSED]  │ KES 8K   │  56    │[✓ Resolve│
│  Will ETH flip BTC?  │ [PENDING] │ —        │   0    │[▶ Open]  │
│                                                                  │
│  Status badges are coloured (see DESIGN_SYSTEM.md)               │
└──────────────────────────────────────────────────────────────────┘

RESOLVE MODAL (opens inline for CLOSED markets):
┌──────────────────────────────────────────────────────────────────┐
│  Resolve: "Will Musk tweet…?"                                    │
│                                                                  │
│  Select Outcome:                                                 │
│  [ YES — Resolves YES, pays out YES shareholders ]              │
│  [ NO  — Resolves NO,  pays out NO shareholders  ]              │
│                                                                  │
│  ⚠ This action is IRREVERSIBLE.                                  │
│                                                                  │
│  [  Cancel  ]              [  Resolve Market  ] ← danger button │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Global Navigation Bar

**Used on all pages.**

```
DESKTOP (≥1024px)
┌──────────────────────────────────────────────────────────────────┐
│ [🔮 FoTell]   [Markets]  [Portfolio*]  [Admin*]          [Alice▾]│
│               ↑ always   ↑ auth only   ↑ admin        ↑ avatar  │
│                                          only         dropdown  │
└──────────────────────────────────────────────────────────────────┘
  * shown only when authenticated / admin role

Avatar dropdown:
  ┌──────────────────┐
  │ alice_trader     │
  │ KES 4,500 balance│
  │ ────────────────  │
  │ Dashboard        │
  │ Portfolio        │
  │ Settings         │
  │ ────────────────  │
  │ Sign Out         │
  └──────────────────┘

MOBILE (<1024px) — hamburger menu
┌──────────────────────────────────────────────────────────────────┐
│ [🔮 FoTell]                                           [☰ Menu]  │
└──────────────────────────────────────────────────────────────────┘
  Slide-in drawer (right) with same nav links
```

---

## 11. Responsive Breakpoints

| Breakpoint | Min Width | Layout Changes |
|---|---|---|
| `sm` | 640px | — |
| `md` | 768px | 2-col market grid |
| `lg` | 1024px | Desktop navbar, sidebar layout on market detail |
| `xl` | 1280px | Wider containers |
| `2xl` | 1536px | Max content width cap at 1400px |
