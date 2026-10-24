import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";

export type SettingsTrip = {
  id: string;
  name: string;
  budget: number;
  startDate: string;
  endDate: string;
  spent: number;
  expenseCount: number;
};

export type SettingsMonth = {
  id: string;
  name: string;
  label: string | null;
  budget: number;
  spent: number;
};

/** Trips and months, newest first, with what was spent in each. */
export async function getSettingsData(): Promise<{ trips: SettingsTrip[]; months: SettingsMonth[] }> {
  const [trips, cycles, byTrip, byCycle] = await Promise.all([
    prisma.trip.findMany({ orderBy: { startDate: "desc" } }),
    prisma.budgetCycle.findMany({ orderBy: { startDate: "desc" } }),
    prisma.expense.groupBy({
      by: ["tripId"],
      where: { tripId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.groupBy({ by: ["cycleId"], where: { cycleId: { not: null } }, _sum: { amount: true } }),
  ]);

  const tripTotals = new Map(byTrip.map((g) => [g.tripId, g]));
  const cycleTotals = new Map(byCycle.map((g) => [g.cycleId, g._sum.amount?.toNumber() ?? 0]));

  return {
    trips: trips.map((t) => ({
      id: t.id,
      name: t.name,
      budget: t.totalBudget.toNumber(),
      startDate: dayKey(t.startDate),
      endDate: dayKey(t.endDate),
      spent: tripTotals.get(t.id)?._sum.amount?.toNumber() ?? 0,
      expenseCount: tripTotals.get(t.id)?._count ?? 0,
    })),
    months: cycles.map((c) => ({
      id: c.id,
      name: c.name,
      label: c.label,
      budget: c.startingBudget.toNumber(),
      spent: cycleTotals.get(c.id) ?? 0,
    })),
  };
}
