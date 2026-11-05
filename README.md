# Life Analytics (LifeOS)

A personal, phone-first web app that puts the day-to-day bits of life in one place. One person per copy, behind a passcode. It installs on a phone's home screen like an app, and can send push notifications.

## What's in it

- **Budget**: monthly budget and trips. Log expenses (even offline; they sync when you're back online), see how much is left today, and compare with last month or a typical month. It also covers categories and bank/Tricount/cash balances. **Subscriptions** show up when they're due, and you log or skip them with one tap.
- **Beer**: built on Budget's expenses. Pints and litres per month, pubs (picked from nearby OpenStreetMap pubs or typed in), price per pint, and a pub map.
- **Lessons**: a study tracker per semester. Log hours per course by hand or with a timer, a lesson grid per week, exams, and your pace compared with earlier semesters. **Tracked time** works the same for things that aren't study.
- **Reminders**: one-off and repeating to-dos, plus "last done" items (how long since you last washed the sheets) with a nudge when one is overdue. It also has a calendar of how often each item gets done.
- **People**: a contact book with birthdays, things to remember, notes, gift ideas, who knows who, and a nudge to catch up with people you haven't seen or messaged in a while.
- **Wardrobe**: clothes with photos (cut-outs keep a see-through background), outfits, "wore this today", cost per wear, and a wash basket split into coloured and white loads.
- **Diary**: little bits throughout the day plus a mood, a 30-day mood strip, and **On this day**: the same day in earlier years, with your beers, study, outfits, recipes and trips from that day.
- **Recipes**: your own cookbook, a swipe deck of new recipes (Spoonacular), a saved/made list and "what can I make with what's in my fridge".
- **Waypoint**: a van-first road-trip journal with routes on a map, stats, a sticker wall and image exports.
- **Settings**: push notifications per device (morning digest with the weather, study goal, expenses, Sunday review…), a weather location, and a download of all your data.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS v4, Prisma 7 with Supabase Postgres, deployed on Vercel. Scheduled jobs (push notifications, backups) run on GitHub Actions.

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
| `NEXT_PUBLIC_THEME` | Optional. Empty = green with a sheep, `cat` = pink with a cat. Read at build time. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Optional, for push notifications. Make a pair with `npx web-push generate-vapid-keys`. Without them push is off. Every copy can use the same pair. |
| `VAPID_SUBJECT` | Optional contact for the push services (a `mailto:` or a URL). |
| `CRON_SECRET` | Any long random string. The scheduler sends it to `/api/push/cron`. Use a different one for each copy. |
| `CAT_DIRECT_URL` | Optional. A second copy's direct connection, only read by `npm run db:check`. |

Both connection strings are in Supabase under **Connect** (or Project Settings → Database).

## Setting up a database

On a new, empty Supabase project:

```bash
npm run db:push                 # create the tables
npx tsx prisma/apply-checks.ts  # lock out Supabase's public API + add extra checks
npm run db:seed                 # optional: starter budget categories
npm run db:check                # optional: confirm the database matches the schema
```

Run `db:push` and `apply-checks.ts` again **every time `prisma/schema.prisma`, `prisma/checks.ts` or `prisma/apply-checks.ts` changes**. `apply-checks.ts` is safe to repeat.

The `prisma/import-*.ts`, `prisma/label-periods.ts` and `prisma/merge-beer-categories.ts` scripts are one-off imports and fixes for my own data. Don't run them on anyone else's database.

## Deploying

Import the repo in Vercel and set `DATABASE_URL`, `APP_PASSWORD`, `AUTH_SECRET`, `CRON_SECRET` and the optional ones you use (`SPOONACULAR_API_KEY`, `NEXT_PUBLIC_THEME`, the VAPID keys). Every push to `main` deploys.

Functions run in London (`vercel.json`), so a Supabase project in **eu-west-2 (London)** is the fastest.

## Scheduled jobs (GitHub Actions)

- **Push notifications** (`.github/workflows/push-cron.yml`): every 15 minutes it calls each copy's `/api/push/cron` with its `CRON_SECRET`. That's what sends the digest and the other reminders. Repository secrets: `LIFEOS_URL` / `LIFEOS_CRON_SECRET`, and `CAT_URL` / `CAT_CRON_SECRET` for the second copy (a copy without a URL is skipped).
- **Backups** (`.github/workflows/backup.yml`): every Sunday it does a `pg_dump` of each database and checks that it restores. It then encrypts each dump and commits it to a separate **private** repo. Secrets: `BACKUP_REPO`, `BACKUP_DEPLOY_KEY`, `BACKUP_PASSPHRASE`, `OWN_DATABASE_URL` and `CAT_DATABASE_URL`. To restore: `gpg -d own/<date>.sql.gz.gpg | gunzip > restore.sql`, then `psql "<empty project's DIRECT_URL>" -f restore.sql`, then `npx tsx prisma/apply-checks.ts`.
  - The same workflow keeps both scheduled workflows enabled. GitHub turns them off after 60 days without commits.

## A second copy for someone else

The same repo can run any number of independent copies, each with its own Vercel project, Supabase project, passcode and data. That's how the cat version runs (`NEXT_PUBLIC_THEME=cat`: pink theme, cat mascot, cat fun facts and its own app icon).

Code changes reach every copy on the next push. **Database changes don't.** After changing the schema or the checks, run `db:push` and `apply-checks.ts` against each copy's database: point the two URLs in `.env` at it, run them, and point `.env` back. With `CAT_DIRECT_URL` set, `npm run db:check` then confirms both match.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`: develop, build (also type-checks), serve
- `npm run lint`: ESLint
- `npm test` / `npm run test:watch`: Vitest unit tests for the pure logic in `src/lib`
- `npm run db:push` / `npm run db:check` / `npm run db:studio` / `npm run db:seed`: schema, drift check, data browser, starter categories

Developer notes on how everything fits together are in [CLAUDE.md](CLAUDE.md).
