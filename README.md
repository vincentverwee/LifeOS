# Life Analytics

A personal life-analytics application — expenses, budgeting, subscriptions, habits, and other personal metrics, all in one place. This is the initial technical foundation; the real data model comes later.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM 7 (driver adapters) + Supabase Postgres
- Deploys to Vercel

## Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase project's connection strings:

- `DATABASE_URL` — the pooled connection (via Supabase's connection pooler, port 6543). Used by the app at runtime.
- `DIRECT_URL` — the direct connection (port 5432, bypasses the pooler). Used only by Prisma CLI commands (migrate/push/studio), since DDL statements aren't reliable through pgbouncer.

Both are in your Supabase project under Project Settings → Database → Connection string.

Then generate the Prisma client and start the app:

```bash
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verifying the database connection

Hit [http://localhost:3000/api/health](http://localhost:3000/api/health) — it runs a trivial query through Prisma and reports whether the database is reachable.

To push the schema to Supabase (creates the temporary `HealthCheck` table):

```bash
npm run db:push
```

## Project structure

```
src/
  app/            routes (Dashboard, Expenses, Insights, Settings, /api/health)
  components/     reusable UI components
  lib/            application logic, Prisma client singleton
  generated/      Prisma Client output (generated, not committed)
prisma/
  schema.prisma   data model (currently a single temporary model)
prisma7.config.ts connection config for Prisma CLI commands
```

## Current state

The `HealthCheck` model in `prisma/schema.prisma` exists only to verify the Prisma ↔ Supabase connection. The real schema will be designed once existing expense-tracking spreadsheets and other data sources are reviewed — nothing about the eventual data model should be assumed from this placeholder.

## Other scripts

- `npm run build` / `npm run start` — production build/serve
- `npm run lint` — ESLint
- `npm run db:studio` — Prisma Studio (visual data browser)
