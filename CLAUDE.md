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
  app/          routes: / (dashboard), /expenses, /insights, /settings, /api/health
  components/   reusable UI (e.g. Navigation)
  lib/          app logic + Prisma client singleton
  generated/    Prisma Client output (generated, gitignored)
prisma/schema.prisma   data model — currently just a temporary HealthCheck model
prisma7.config.ts      Prisma CLI datasource config
```

## Current state / what's temporary

`HealthCheck` (in `prisma/schema.prisma`) and `GET /api/health` exist solely to verify Prisma ↔ Supabase connectivity. Delete both once the real schema exists. Verified working end-to-end (schema pushed to the actual Supabase project).
