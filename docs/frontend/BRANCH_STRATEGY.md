# Git Branch Strategy

> Branch naming conventions, workflow, PR rules, and commit message standards.

---

## 1. Branch Hierarchy

```
main                          ← production-ready, protected
└── frontend                  ← integration branch for all frontend work
    ├── feat/landing-page     ← Public landing / home page
    ├── feat/auth             ← Login, Register pages
    ├── feat/markets-list     ← Market directory page
    ├── feat/market-detail    ← Single market view + price chart
    ├── feat/trade-execution  ← Trade panel, confirm modal, receipt
    ├── feat/dashboard        ← Authenticated user dashboard
    ├── feat/portfolio        ← Positions and trade history
    ├── feat/create-market    ← Admin — market creation wizard
    └── feat/admin            ← Admin — market lifecycle panel
```

> **Note on naming:** Git's ref system prevents a branch named `frontend` from having children at `frontend/feat/…`. The feature branches therefore use the short `feat/<name>` convention and are all cut from, and merged back into, `frontend`.

---

## 2. Branch Lifecycle

```
1. Cut from `frontend`:
   git checkout frontend
   git pull origin frontend
   git checkout -b feat/<page-name>

2. Develop (commit atomically, see §4):
   git add .
   git commit -m "feat(landing-page): add hero section with CTA buttons"

3. Keep up-to-date with `frontend`:
   git fetch origin
   git rebase origin/frontend

4. Open PR → `frontend` when feature is ready for review.

5. After merge into `frontend`, delete the feature branch:
   git branch -d feat/<page-name>
   git push origin --delete feat/<page-name>

6. When the full frontend is stable, open PR `frontend` → `main`.
```

---

## 3. Branch Naming Conventions

| Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New page / feature | `feat/landing-page` |
| `fix/` | Bug fix on a feature branch | `fix/trade-panel-slippage-input` |
| `chore/` | Setup, config, tooling | `chore/setup-nextjs` |
| `docs/` | Documentation updates | `docs/update-wireframes` |
| `refactor/` | Code restructure, no logic change | `refactor/extract-market-card` |

---

## 4. Commit Message Format

Follows **Conventional Commits** specification.

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

| Type | When |
|---|---|
| `feat` | New feature or page |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `chore` | Build, deps, config changes |
| `docs` | Documentation only |
| `refactor` | Code changes with no behaviour change |
| `test` | Adding or fixing tests |
| `style` | Formatting, no logic change |

**Scopes** (match feature branch names):

`landing-page` | `auth` | `markets-list` | `market-detail` | `trade-execution` | `dashboard` | `portfolio` | `create-market` | `admin` | `design-system` | `api-client` | `components`

**Examples:**

```
feat(markets-list): add status filter chips and search input

fix(trade-execution): clamp max-slippage to 0-50% range

perf(market-detail): memoize PriceChart to prevent re-renders

chore(setup): initialise Next.js project with Tailwind + shadcn/ui

docs(design-system): add button variant reference table

refactor(components): extract ProbabilityBar into shared atoms
```

---

## 5. Pull Request Checklist

Before merging any `feat/*` PR into `frontend`:

- [ ] Feature matches wireframe spec in `docs/frontend/WIREFRAMES.md`
- [ ] All components match specs in `docs/frontend/COMPONENTS.md`
- [ ] Colours / fonts follow `docs/frontend/DESIGN_SYSTEM.md`
- [ ] API calls use the typed service layer (`lib/api/*.service.ts`)
- [ ] Error states handled (loading skeleton, error card, empty state)
- [ ] Mobile responsive (tested at 375px width)
- [ ] No TypeScript errors (`next build` passes)
- [ ] No ESLint errors
- [ ] Auth guard applied where required

---

## 6. Development → `frontend` Merge Order (recommended)

Build in this order to unblock parallel work:

```
1. chore/setup-nextjs          ← scaffolding, Tailwind, shadcn/ui, Axios
2. feat/auth                   ← needed by all auth-gated pages
3. feat/markets-list           ← core browsing experience
4. feat/market-detail          ← depends on market card pattern from #3
5. feat/trade-execution        ← depends on market detail layout
6. feat/dashboard              ← depends on auth + positions API
7. feat/portfolio              ← depends on trade history
8. feat/create-market          ← admin workflow
9. feat/admin                  ← admin lifecycle management
10. feat/landing-page          ← showcases markets, can reference all above
```

---

## 7. Environment Setup per Branch

Each developer working on a feature branch should:

```bash
# 1. Clone and install
git clone git@github.com:Mvoii/fotell.git
cd fotell
git checkout frontend
git checkout feat/<your-page>

# 2. Setup Next.js app (in frontend/ subdirectory)
cd frontend
npm install

# 3. Configure environment
cp .env.example .env.local
# edit NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# 4. Start dev server
npm run dev         # http://localhost:3000

# 5. Backend must be running separately
# cd .. && go run ./api/main.go
```
