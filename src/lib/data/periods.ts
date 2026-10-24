import "server-only";
import { prisma } from "@/lib/prisma";
import { ensureCurrentMonth } from "@/lib/data/ensureMonth";

export type PeriodType = "cycle" | "trip";

export type Period = {
  type: PeriodType;
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type PeriodKey = `${PeriodType}:${string}`;

export async function getAllPeriods(): Promise<Period[]> {
  await ensureCurrentMonth();
  const [cycles, trips] = await Promise.all([
    prisma.budgetCycle.findMany({
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.trip.findMany({
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const periods: Period[] = [
    ...cycles.map((cycle) => ({
      type: "cycle" as const,
      id: cycle.id,
      name: cycle.name,
      startDate: cycle.startDate.toISOString(),
      endDate: cycle.endDate.toISOString(),
    })),
    ...trips.map((trip) => ({
      type: "trip" as const,
      id: trip.id,
      name: trip.name,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
    })),
  ];

  periods.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return periods;
}

/** Periods whose date range contains `todayKey` ("YYYY-MM-DD"), trips first. */
export function getRunningPeriods(periods: Period[], todayKey: string): Period[] {
  return periods
    .filter((p) => p.startDate.slice(0, 10) <= todayKey && todayKey <= p.endDate.slice(0, 10))
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "trip" ? -1 : 1));
}

/**
 * The period named by the URL, else the one running today (a trip wins over
 * the month), else the newest period.
 */
export function resolveActivePeriod(
  periods: Period[],
  requestedKey: string | undefined,
  todayKey?: string
): Period | null {
  if (periods.length === 0) return null;

  if (requestedKey) {
    const [type, id] = requestedKey.split(":");
    const match = periods.find((p) => p.type === type && p.id === id);
    if (match) return match;
  }

  if (todayKey) {
    const running = getRunningPeriods(periods, todayKey)[0];
    if (running) return running;
  }

  return periods[0];
}
