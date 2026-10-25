@AGENTS.md

# Life Analytics (LifeOS)

Personal life-analytics app — expenses/budgeting first, later subscriptions, habits, sleep, productivity, etc. Currently at **Milestone 1: technical foundation only**. No real data model yet — it will be designed once the user's existing expense-tracking spreadsheets are reviewed. Do not invent schema, categories, or fake data ahead of that.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + Prisma 7 (driver adapters) + Supabase Postgres. Deploys to Vercel.

## Commands

```bash
npm run dev         # start dev server
npm run build       # production build (also type-checks)
npm run lint        # ESLint
npx prisma generate # regenerate Prisma Client (also runs automatically via postinstall)
npm run db:push     # push prisma/schema.prisma to Supabase (no migration history yet)
npm run db:studio   # Prisma Studio
```

## Environment

`.env` (gitignored, never commit) needs two Supabase connection strings — see `.env.example`:
- `DATABASE_URL` — pooled (pgbouncer, port 6543). Used by the app at runtime.
- `DIRECT_URL` — direct (port 5432). Used only by Prisma CLI commands (push/migrate/studio) — DDL isn't reliable through pgbouncer.
- `SPOONACULAR_API_KEY` — server-only, for the /recipes deck. Free tier ≈150 points/day; one deck batch (10 recipes) costs ~1.6.

## Prisma 7 specifics (important — differs from Prisma 5/6 patterns)

- Connection URLs are **not** in `prisma/schema.prisma`. They live in `prisma7.config.ts` (CLI commands) and are read directly from `process.env` in app code (runtime).
- `PrismaClient` requires an explicit driver adapter — there is no bare `new PrismaClient()`. See [src/lib/prisma.ts](src/lib/prisma.ts): a `pg.Pool` wrapped in `@prisma/adapter-pg`'s `PrismaPg`, passed as `{ adapter }`.
- Generated client output goes to `src/generated/prisma` (not `node_modules`), gitignored, regenerated via `postinstall`. Import from `@/generated/prisma/client`.
- The config file is named `prisma7.config.ts` (not `prisma.config.ts`) — this is Prisma's intentional convention for this major version, not a typo.

## Structure

```
src/
  app/          routes: / (feature hub), /budget ("today at a glance": left today, same-day vs last month / typical month, today's expenses, balances), /budget/add (entry form + category management), /budget/expenses (all expenses of a month/trip, `?category=` filter, edit/delete), /budget/insights (any month/trip vs the average of its label peers; categories, all periods), /budget/settings (trips: new/edit/delete; months: budget + label), /recipes (Tinder-style swipe deck from Spoonacular, `?cuisine=&type=&maxTime=` filters; /recipes/saved to-make + made lists; /recipes/[id] detail, mark made, remove), /waypoint (road-trip journal: dashboard, /trips, /trips/[id], /trips/[id]/export, /map, /map/export, /stats), /api/health
  components/   waypoint/ (all Waypoint UI incl. its shadcn ui/), recipes/ (SwipeDeck, DeckFilters, Sheet), dashboard/, expenses/, categories/, month/ (BalancesCard, MonthChart), insights/, settings/
  lib/          actions/ (server actions), data/ (server-only queries), recipes/ (Spoonacular client + card types/filter lists), waypoint/ (routing/OSRM, stats, colors, export helpers, row mapping), monthStats.ts (pure month math), format.ts
  generated/    Prisma Client output (generated, gitignored)
prisma/schema.prisma   data model
prisma/seed.ts         seeds starter categories
prisma/label-periods.ts   one-off: fills missing labels (before Sep 2026 = Thuis, else Galway)
prisma/import-old-budget.ts one-off import of ExcelContextFiles/budget.xlsx (Apr–Aug 2026, 18th→17th periods; spend derived from daily balance drops, category "Oud budget", archived)
prisma/import-excel.ts one-off import of ExcelContextFiles/BudgetGalway.xlsx (idempotent; `npx tsx prisma/import-excel.ts [--dry]`)
prisma/import-waypoint.ts one-off copy of the old standalone Waypoint Supabase project (idempotent upsert by UUID; needs WAYPOINT_SUPABASE_URL/_ANON_KEY)
prisma7.config.ts      Prisma CLI datasource config
```

## Data model in one paragraph

A **month** is a `BudgetCycle` (calendar month, created automatically by `ensureCurrentMonth()` in `src/lib/data/ensureMonth.ts` the first time a new month is viewed, copying the previous one; `startingBudget` = monthly budget, plus manual `bank`/`tricount`/`cash` balances and `rent`/`rentDay`). A **trip** is a `Trip`. Both hold `Expense` rows (`cycleId` or `tripId`, validated in `src/lib/actions/expenses.ts`). **Categories are one global list** (`Category`: name, color slot, sortOrder, isArchived, optional `pintPrice`), managed on the expenses page; there is no separate tag concept. Daily totals, cumulative-vs-budget, category/weekday stats, beer stats and the balance outlook are all **computed from expenses** in `src/lib/monthStats.ts` — nothing is stored per day. A category with a `pintPrice` counts as beer. `BudgetCycle.label` ("Thuis", "Galway") groups periods; Insights compares a period with the average of the other *finished* periods with the same label, by day of the period (`src/lib/insights.ts`). New months inherit the previous label. `BudgetCycleDay` is legacy and unused. `SavingsEntry` and `Debt` are still display-only (no entry UI). **Recipes**: a right swipe stores a full snapshot in `SavedRecipe` (keyed by `spoonacularId`, `madeOn` null = still to make), so the saved list and detail pages never call the API. Left swipes aren't stored; the deck only skips saved recipes and those already shown in the current visit. `HealthCheck` + `GET /api/health` exist only to verify Prisma <-> Supabase connectivity.

**Waypoint** (merged in from a standalone app, history included; old notes in `docs/waypoint.md`) is unrelated to budget trips: `WaypointTrip` (UUID id, dates, `totalKm`, `routePreference`, whole-trip OSRM `routeGeometry` JSON) has ordered `WaypointLocation` stops (`visitOrder`). Its components still speak the old snake_case Supabase shapes (`src/lib/waypoint/types.ts`); `src/lib/waypoint/rows.ts` maps Prisma rows to them. Server pages read via `src/lib/data/waypoint.ts`; client pages call the server actions in `src/lib/actions/waypoint.ts` (same names/signatures as the old browser-side `trips-store`).

## Gotchas

- After `prisma generate`/`db:push` changes, **restart `npm run dev`** — the running server keeps the old generated client in memory.
- Date-only columns are UTC midnight; use `dayKey()`/`toDateInputValue()` from `src/lib/format.ts` rather than `toISOString()` slices scattered around.
- Amount inputs go through `parseAmount()` (accepts `6,8+7,4` sums).
- **"Today" on the server** comes from `getTodayKey()` / `getTimeZone()` in `src/lib/today.ts` (browser timezone via the `tz` cookie set by `TimeZoneSync`, fallback Europe/Dublin) — never `toDateInputValue()` server-side, Vercel runs in UTC.
- An expense's **date decides its month**: `createExpense`/`updateExpense` move it to the `BudgetCycle` that covers the date ("yesterday" on the 1st lands in last month); trips only accept dates inside the trip.
- Pages that read the DB without searchParams/cookies need `await connection()` or they get prerendered at build time.
- **Waypoint styling** uses the same Meadow tokens as Budget (no separate palette). Its shadcn-style UI (`src/components/waypoint/ui`) reads the aliases `card`, `muted`, `muted-foreground`, `popover`, `secondary`, `destructive`, `input` and `ring` that `globals.css` maps onto Meadow. `accent` is NOT an alias (it is Meadow's grass green for charts), so Waypoint hover states use `bg-surface-muted`. `src/app/waypoint/layout.tsx` renders `data-waypoint`, which only widens the root `<main>`.
- **Waypoint image export on iOS** (`src/lib/waypoint/useImageExport.ts`): render and save are two separate taps, the image is a Blob (never a `data:` URL), and nothing may be `await`ed before `navigator.share`. Maps that get captured need `preserveDrawingBuffer` (opt-in prop). The public OSRM server ignores `avoid_tolls`.

## Mobile-first conventions

- Phones are the primary target (~375px). Budget pages get a fixed bottom tab bar (`src/components/budget/BudgetTabBar.tsx`, hidden from `sm:`); its height is cleared by the `.pb-tabbar` utility in `globals.css`. Respect `env(safe-area-inset-*)`.
- Inputs are forced to 16px below `sm` in `globals.css` (prevents iOS focus-zoom) — don't fight it with per-input sizes.
- **Buttons** use the shared utilities in `globals.css`: `btn` (pill shape, hover tint, tap tint + press-in, focus ring, disabled) plus one colour — `btn-primary`, `btn-outline`, `btn-danger`, `btn-destructive`, `btn-ghost` (text links too). Tappable rows/cards use `tap`. Waypoint's `Button`/`buttonVariants` are built on the same classes; don't hand-roll button colours or `rounded-lg` buttons.
- Tap targets ≥ ~48px; wide tables get a stacked list variant below `sm` (see `MonthInsights.tsx`).
- PWA: `src/app/manifest.ts`, icons in `public/icon-*.png` + `src/app/apple-icon.png` (generated from `src/app/icon.svg` with sharp).
