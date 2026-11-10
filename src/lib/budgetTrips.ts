import { prisma } from "@/lib/prisma";
import { MAX_AMOUNT, formatDate, parseDateKey } from "@/lib/format";

/* Budget trip rules shared by the budget settings actions and Waypoint's planned trips. */

export type CreateTripInput = {
  name: string;
  totalBudget: number;
  /** "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
};

export type ValidTrip = { name: string; totalBudget: number; startDate: Date; endDate: Date };

export function validate(input: CreateTripInput): { ok: true; trip: ValidTrip } | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the trip a name." };
  if (name.length > 60) return { ok: false, error: "Keep the name under 60 characters." };
  if (!Number.isFinite(input.totalBudget) || input.totalBudget <= 0 || input.totalBudget > MAX_AMOUNT) {
    return { ok: false, error: "Enter a budget greater than zero." };
  }
  const start = parseDateKey(input.startDate);
  const end = parseDateKey(input.endDate);
  if (!start || !end) return { ok: false, error: "Pick a start and end date." };
  if (end < start) return { ok: false, error: "The end date can't be before the start date." };
  return {
    ok: true,
    trip: {
      name,
      totalBudget: Math.round(input.totalBudget * 100) / 100,
      startDate: new Date(`${start}T00:00:00Z`),
      endDate: new Date(`${end}T00:00:00Z`),
    },
  };
}

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Trips can't overlap: on a shared day it would be unclear which one an expense belongs to. */
export async function overlapError(tx: Tx, trip: ValidTrip, excludeId?: string): Promise<string | null> {
  const clash = await tx.trip.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      startDate: { lte: trip.endDate },
      endDate: { gte: trip.startDate },
    },
    select: { name: true, startDate: true, endDate: true },
  });
  return clash
    ? `Overlaps with ${clash.name} (${formatDate(clash.startDate)} – ${formatDate(clash.endDate)}).`
    : null;
}

/** Don't strand expenses outside the trip's new dates. */
export async function strandedError(tx: Tx, tripId: string, startDate: Date, endDate: Date): Promise<string | null> {
  const outside = await tx.expense.count({
    where: { tripId, OR: [{ date: { lt: startDate } }, { date: { gt: endDate } }] },
  });
  if (outside === 0) return null;
  return `${outside} ${outside === 1 ? "expense falls" : "expenses fall"} outside those dates. Move or delete ${outside === 1 ? "it" : "them"} first.`;
}
