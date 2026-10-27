# Life Analytics (LifeOS)

A personal, phone-first web app that puts the day-to-day bits of life in one place. One person per copy, behind a passcode. It installs on a phone's home screen like an app.

## What's in it

- **Budget**: monthly budget and trips. Log expenses (even offline; they sync when you're back online), see how much is left today, compare with last month or a typical month, categories, beer stats and bank/Tricount/cash balances.
- **Lessons**: a study tracker per semester. Log hours per course, a lesson grid per week, exams, and pace compared with earlier semesters.
- **Reminders**: one-off and repeating to-dos, plus "last done" items (how long since you last washed the sheets) with a nudge when one is overdue.
- **Recipes**: your own cookbook, a swipe deck of new recipes (Spoonacular), a saved/made list and "what can I make with what's in my fridge".
- **Waypoint**: a road-trip journal with routes on a map, stats and image exports.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS v4, Prisma 7 with Supabase Postgres, deployed on Vercel.

## Local setup

```bash
npm install            # also generates the Prisma client
cp .env.example .env   # then fill it in, see below
npm run dev            # http://localhost:3000
```

### `.env`

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Supabase **pooled** connection (port 6543, ends in `?pgbouncer=true`). Used by the app. |
| `DIRECT_URL` | Supabase **direct** connection (port 5432). Only used by the database commands below, never on Vercel. |
| `APP_PASSWORD` | The passcode, 4–8 digits. Without it the lock is off in development and the whole site is locked in production. |
| `AUTH_SECRET` | Any long random string (`openssl rand -base64 32`). Changing it logs every device out. |
| `SPOONACULAR_API_KEY` | Optional, for the recipe swipe deck and fridge search ([free key](https://spoonacular.com/food-api/console), ~150 points a day). |
| `NEXT_PUBLIC_THEME` | Optional. Empty = green with a sheep, `cat` = pink with a cat. |

Both connection strings are in Supabase under **Connect** (or Project Settings → Database).

## Setting up a database

On a new, empty Supabase project:

```bash
npm run db:push                 # create the tables
npx tsx prisma/apply-checks.ts  # lock out Supabase's public API + add extra checks
npm run db:seed                 # optional: starter budget categories
```

Run the first two again **every time `prisma/schema.prisma` changes**. `apply-checks.ts` is safe to repeat.

The `prisma/import-*.ts` and `prisma/label-periods.ts` scripts are one-off imports of my own old spreadsheets and data. Don't run them on anyone else's database.

## Deploying

Import the repo in Vercel and set `DATABASE_URL`, `APP_PASSWORD`, `AUTH_SECRET` and optionally `SPOONACULAR_API_KEY` and `NEXT_PUBLIC_THEME`. Every push to `main` deploys.

Functions run in London (`vercel.json`), so a Supabase project in **eu-west-2 (London)** is the fastest.

## A second copy for someone else

The same repo can run any number of independent copies, each with its own Vercel project, Supabase project, passcode and data. That's how the cat version runs (`NEXT_PUBLIC_THEME=cat`: pink theme, cat mascot, cat fun facts and its own app icon).

Code changes reach every copy on the next push. **Database changes don't.** After changing the schema, run `db:push` and `apply-checks.ts` against each copy's database: point the two URLs in `.env` at it, run them, and point `.env` back.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`: develop, build (also type-checks), serve
- `npm run lint`: ESLint
- `npm run db:push` / `npm run db:studio` / `npm run db:seed`: schema, data browser, starter categories

Developer notes on how everything fits together are in [CLAUDE.md](CLAUDE.md).
