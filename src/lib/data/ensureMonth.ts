import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getTodayKey } from "@/lib/today";

const DEFAULT_BUDGET = 1000;

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

// Arbitrary constant: serialises concurrent first-loads of a new month.
const MONTH_LOCK_KEY = 7_311_001;

const MS_PER_DAY = 86_400_000;

function utcDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function lastDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

type Db = Pick<typeof prisma, "budgetCycle">;

function findCovering(db: Db, date: Date) {
  return db.budgetCycle.findFirst({
    where: { startDate: { lte: date }, endDate: { gte: date } },
    select: { id: true },
  });
}

/**
 * Months are automatic: the first time anything needs a date that no month
 * covers, the month(s) up to it are created from the latest earlier one
 * (budget, rent, rent day, label, balances). Only trips are manual.
 *
 * - Months the app was never opened in are filled in too, so there are no gaps
 *   (back-dating an expense into them works, and "last month" is really last month).
 * - Coverage is by date range, not by the 1st: after an imported 18th→17th
 *   period the next month starts on the 18th and runs to the end of that month.
 * - Never creates past the end of next month, so a typo'd year can't spawn
 *   decades of months.
 *
 * Cheap when the month exists: a single indexed lookup.
 */
export async function ensureMonthFor(dateKey: string, todayKey: string): Promise<void> {
  const date = utcDate(dateKey);
  const today = utcDate(todayKey);
  const limit = lastDayOfMonth(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)));
  if (date > limit) return;

  if (await findCovering(prisma, date)) return;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${MONTH_LOCK_KEY})`;

    // Re-check under the lock: a concurrent request may have just created it.
    if (await findCovering(tx, date)) return;

    const [previous, next] = await Promise.all([
      tx.budgetCycle.findFirst({ where: { startDate: { lt: date } }, orderBy: { startDate: "desc" } }),
      tx.budgetCycle.findFirst({ where: { startDate: { gt: date } }, orderBy: { startDate: "asc" } }),
    ]);
    // Before the first month ever: that's history, not something to fill in.
    if (!previous && next) return;

    let start = previous
      ? new Date(previous.endDate.getTime() + MS_PER_DAY)
      : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

    while (start <= date) {
      let end = lastDayOfMonth(start);
      // Don't run into a month that already exists after the gap.
      if (next && end >= next.startDate) end = new Date(next.startDate.getTime() - MS_PER_DAY);

      await tx.budgetCycle.create({
        data: {
          name: `${MONTH_NAMES[start.getUTCMonth()]} ${start.getUTCFullYear()}`,
          startingBudget: previous?.startingBudget ?? DEFAULT_BUDGET,
          startDate: start,
          endDate: end,
          rent: previous?.rent ?? 0,
          rentDay: previous?.rentDay ?? null,
          label: previous?.label ?? null,
          bank: previous?.bank ?? 0,
          tricount: previous?.tricount ?? 0,
          cash: previous?.cash ?? 0,
        },
      });
      start = new Date(end.getTime() + MS_PER_DAY);
    }
  });
}

/** The month covering today exists. Once per request, however many loaders ask. */
export const ensureCurrentMonth = cache(async (): Promise<void> => {
  const todayKey = await getTodayKey();
  await ensureMonthFor(todayKey, todayKey);
});
