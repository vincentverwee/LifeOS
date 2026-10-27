import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { compareRoutines, type Routine } from "@/lib/reminders/routines";
import { INSIGHT_DAYS, type RoutineLogs } from "@/lib/reminders/insights";
import { addDays } from "@/lib/reminders/schedule";

const RECENT = 6;

function toRoutine(row: { id: string; name: string; everyDays: number | null; logs: { doneOn: Date }[] }): Routine {
  const recent = row.logs.map((l) => dayKey(l.doneOn));
  return { id: row.id, name: row.name, everyDays: row.everyDays, lastDoneOn: recent[0] ?? null, recent };
}

/** Every Last done item, due first then longest ago. */
export async function getRoutines(todayKey: string): Promise<Routine[]> {
  const rows = await prisma.routine.findMany({
    select: {
      id: true,
      name: true,
      everyDays: true,
      logs: { orderBy: { doneOn: "desc" }, take: RECENT, select: { doneOn: true } },
    },
  });
  return rows.map(toRoutine).sort(compareRoutines(todayKey));
}

export type RoutineDetail = Routine & { logs: { id: string; doneOn: string }[] };

export async function getRoutine(id: string): Promise<RoutineDetail | null> {
  const row = await prisma.routine.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      everyDays: true,
      logs: { orderBy: { doneOn: "desc" }, take: 20, select: { id: true, doneOn: true } },
    },
  });
  if (!row) return null;
  return { ...toRoutine(row), logs: row.logs.map((l) => ({ id: l.id, doneOn: dayKey(l.doneOn) })) };
}

export type RoutineHistoryEntry = { id: string; name: string; doneOn: string };

/** Latest logs across all items, for the Timeline. */
export async function getRoutineHistory(limit: number): Promise<RoutineHistoryEntry[]> {
  const rows = await prisma.routineLog.findMany({
    orderBy: [{ doneOn: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, doneOn: true, routine: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.routine.name, doneOn: dayKey(r.doneOn) }));
}

/** Every item with its logs of the last INSIGHT_DAYS days (oldest first), for Insights. */
export async function getRoutineLogs(todayKey: string): Promise<RoutineLogs[]> {
  const since = new Date(`${addDays(todayKey, -INSIGHT_DAYS)}T00:00:00Z`);
  const rows = await prisma.routine.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      everyDays: true,
      logs: { where: { doneOn: { gte: since } }, orderBy: { doneOn: "asc" }, select: { doneOn: true } },
    },
  });
  return rows.map(({ logs, ...row }) => ({ ...row, doneOns: logs.map((l) => dayKey(l.doneOn)) }));
}
