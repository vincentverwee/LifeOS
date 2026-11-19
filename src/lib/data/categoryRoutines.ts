import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { CATEGORY_SOURCE_PREFIX, categoryIdOf, categorySource } from "@/lib/reminders/routines";

/**
 * Last done items linked to a budget category (`Routine.source` = "budget-category:<id>")
 * are done on every day with an expense in that category. Their RoutineLog rows mirror the
 * expenses: every expense write calls `syncCategoryRoutines` with the (category, day) pairs
 * it touched, which logs a day that has such an expense and removes one that no longer does.
 * Days after today wait for catchUpCategoryRoutines (cron). Deleting a whole trip/month cascades its expenses
 * without a sync, so its logs stay (rare, and they're plain history).
 */
export async function syncCategoryRoutines(pairs: { categoryId: string; date: Date }[]): Promise<void> {
  if (pairs.length === 0) return;
  const sources = [...new Set(pairs.map((p) => categorySource(p.categoryId)))];
  const routines = await prisma.routine.findMany({ where: { source: { in: sources } }, select: { id: true, source: true } });
  if (routines.length === 0) return;

  const todayKey = await getTodayKey();
  const seen = new Set<string>();
  for (const { categoryId, date } of pairs) {
    const key = `${categoryId}|${dayKey(date)}`;
    if (seen.has(key) || dayKey(date) > todayKey) continue;
    seen.add(key);
    const routine = routines.find((r) => categoryIdOf(r.source) === categoryId);
    if (!routine) continue;
    const spent = await prisma.expense.findFirst({ where: { categoryId, date }, select: { id: true } });
    if (spent) {
      await prisma.routineLog.createMany({ data: [{ routineId: routine.id, doneOn: date }], skipDuplicates: true });
    } else {
      await prisma.routineLog.deleteMany({ where: { routineId: routine.id, doneOn: date } });
    }
  }
}

/** Just linked: log every past day with an expense in the category. */
export async function backfillCategoryRoutine(routineId: string, categoryId: string): Promise<void> {
  const today = new Date(`${await getTodayKey()}T00:00:00Z`);
  const days = await prisma.expense.groupBy({ by: ["date"], where: { categoryId, date: { lte: today } } });
  if (days.length === 0) return;
  await prisma.routineLog.createMany({
    data: days.map((d) => ({ routineId, doneOn: d.date })),
    skipDuplicates: true,
  });
}

/**
 * Called by /api/push/cron: a day an expense was dated ahead of time isn't logged when it's
 * saved (it's after today), so once that day has come it's filled in here.
 */
export async function catchUpCategoryRoutines(): Promise<void> {
  const routines = await prisma.routine.findMany({
    where: { source: { startsWith: CATEGORY_SOURCE_PREFIX } },
    select: { id: true, source: true },
  });
  for (const r of routines) {
    const categoryId = categoryIdOf(r.source);
    if (categoryId) await backfillCategoryRoutine(r.id, categoryId);
  }
}
