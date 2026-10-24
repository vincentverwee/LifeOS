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

## Prisma 7 specifics (important — differs from Prisma 5/6 patterns)

- Connection URLs are **not** in `prisma/schema.prisma`. They live in `prisma7.config.ts` (CLI commands) and are read directly from `process.env` in app code (runtime).
- `PrismaClient` requires an explicit driver adapter — there is no bare `new PrismaClient()`. See [src/lib/prisma.ts](src/lib/prisma.ts): a `pg.Pool` wrapped in `@prisma/adapter-pg`'s `PrismaPg`, passed as `{ adapter }`.
- Generated client output goes to `src/generated/prisma` (not `node_modules`), gitignored, regenerated via `postinstall`. Import from `@/generated/prisma/client`.
- The config file is named `prisma7.config.ts` (not `prisma.config.ts`) — this is Prisma's intentional convention for this major version, not a typo.

## Structure

```
src/
  app/          routes: / (feature hub), /budget ("today at a glance": left today, same-day vs last month / typical month, today's expenses, balances), /budget/add (entry form + category management), /budget/expenses (all expenses of a month/trip, `?category=` filter, edit/delete), /budget/insights (any month/trip vs the average of its label peers; categories, all periods), /budget/settings (trips: new/edit/delete; months: budget + label), /api/health
  components/   dashboard/, expenses/, categories/, month/ (BalancesCard, MonthChart), insights/, settings/
  lib/          actions/ (server actions), data/ (server-only queries), monthStats.ts (pure month math), format.ts
  generated/    Prisma Client output (generated, gitignored)
prisma/schema.prisma   data model
prisma/seed.ts         seeds starter categories
prisma/label-periods.ts   one-off: fills missing labels (before Sep 2026 = Thuis, else Galway)
prisma/import-old-budget.ts one-off import of ExcelContextFiles/budget.xlsx (Apr–Aug 2026, 18th→17th periods; spend derived from daily balance drops, category "Oud budget", archived)
prisma/import-excel.ts one-off import of ExcelContextFiles/BudgetGalway.xlsx (idempotent; `npx tsx prisma/import-excel.ts [--dry]`)
prisma7.config.ts      Prisma CLI datasource config
```

## Data model in one paragraph

A **month** is a `BudgetCycle` (calendar month, created automatically by `ensureCurrentMonth()` in `src/lib/data/ensureMonth.ts` the first time a new month is viewed, copying the previous one; `startingBudget` = monthly budget, plus manual `bank`/`tricount`/`cash` balances and `rent`/`rentDay`). A **trip** is a `Trip`. Both hold `Expense` rows (`cycleId` or `tripId`, validated in `src/lib/actions/expenses.ts`). **Categories are one global list** (`Category`: name, color slot, sortOrder, isArchived, optional `pintPrice`), managed on the expenses page; there is no separate tag concept. Daily totals, cumulative-vs-budget, category/weekday stats, beer stats and the balance outlook are all **computed from expenses** in `src/lib/monthStats.ts` — nothing is stored per day. A category with a `pintPrice` counts as beer. `BudgetCycle.label` ("Thuis", "Galway") groups periods; Insights compares a period with the average of the other *finished* periods with the same label, by day of the period (`src/lib/insights.ts`). New months inherit the previous label. `BudgetCycleDay` is legacy and unused. `SavingsEntry` and `Debt` are still display-only (no entry UI). `HealthCheck` + `GET /api/health` exist only to verify Prisma <-> Supabase connectivity.

## Gotchas

- After `prisma generate`/`db:push` changes, **restart `npm run dev`** — the running server keeps the old generated client in memory.
- Date-only columns are UTC midnight; use `dayKey()`/`toDateInputValue()` from `src/lib/format.ts` rather than `toISOString()` slices scattered around.
- Amount inputs go through `parseAmount()` (accepts `6,8+7,4` sums).
- **"Today" on the server** comes from `getTodayKey()` / `getTimeZone()` in `src/lib/today.ts` (browser timezone via the `tz` cookie set by `TimeZoneSync`, fallback Europe/Dublin) — never `toDateInputValue()` server-side, Vercel runs in UTC.
- An expense's **date decides its month**: `createExpense`/`updateExpense` move it to the `BudgetCycle` that covers the date ("yesterday" on the 1st lands in last month); trips only accept dates inside the trip.
- Pages that read the DB without searchParams/cookies need `await connection()` or they get prerendered at build time.

## Mobile-first conventions

- Phones are the primary target (~375px). Budget pages get a fixed bottom tab bar (`src/components/budget/BudgetTabBar.tsx`, hidden from `sm:`); its height is cleared by the `.pb-tabbar` utility in `globals.css`. Respect `env(safe-area-inset-*)`.
- Inputs are forced to 16px below `sm` in `globals.css` (prevents iOS focus-zoom) — don't fight it with per-input sizes.
- Tap targets ≥ ~48px; wide tables get a stacked list variant below `sm` (see `MonthInsights.tsx`).
- PWA: `src/app/manifest.ts`, icons in `public/icon-*.png` + `src/app/apple-icon.png` (generated from `src/app/icon.svg` with sharp).
