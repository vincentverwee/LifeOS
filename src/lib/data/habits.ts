import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { addDays } from "@/lib/reminders/schedule";
import type { HabitLogRow } from "@/lib/reminders/habits";

const HISTORY_DAYS = 90;

/** Daily habits: on/off (+ since when), and the logs of the last 90 days. */
export async function getHabits(todayKey: string): Promise<{ since: string | null; logs: HabitLogRow[] }> {
  const [settings, rows] = await Promise.all([
    prisma.habitSettings.findUnique({ where: { id: "current" } }),
    prisma.habitLog.findMany({
      where: { doneOn: { gte: new Date(`${addDays(todayKey, -HISTORY_DAYS)}T00:00:00Z`) } },
      select: { habit: true, doneOn: true },
    }),
  ]);
  return {
    since: settings ? dayKey(settings.since) : null,
    logs: rows.map((r) => ({ habit: r.habit, doneOn: dayKey(r.doneOn) })),
  };
}
