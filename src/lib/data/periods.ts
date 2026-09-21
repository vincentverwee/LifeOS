import "server-only";
import { prisma } from "@/lib/prisma";

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

export function resolveActivePeriod(
  periods: Period[],
  requestedKey: string | undefined
): Period | null {
  if (periods.length === 0) return null;

  if (requestedKey) {
    const [type, id] = requestedKey.split(":");
    const match = periods.find((p) => p.type === type && p.id === id);
    if (match) return match;
  }

  return periods[0];
}
