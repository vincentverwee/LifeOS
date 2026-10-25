"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MAX_AMOUNT, formatDate, parseDateKey } from "@/lib/format";

export type CreateTripInput = {
  name: string;
  totalBudget: number;
  /** "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
};

export type CreateTripResult = { ok: true; tripId: string } | { ok: false; error: string };

function revalidateTripRoutes() {
  revalidatePath("/"); // hub shows the running trip
  revalidatePath("/budget");
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget/insights");
  revalidatePath("/budget/settings");
}

type ValidTrip = { name: string; totalBudget: number; startDate: Date; endDate: Date };

function validate(input: CreateTripInput): { ok: true; trip: ValidTrip } | { ok: false; error: string } {
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

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Trips can't overlap: on a shared day it would be unclear which one an expense belongs to. */
async function overlapError(tx: Tx, trip: ValidTrip, excludeId?: string): Promise<string | null> {
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

export async function createTrip(input: CreateTripInput): Promise<CreateTripResult> {
  await requireAuth();
  const valid = validate(input);
  if (!valid.ok) return valid;

  const result = await prisma.$transaction(async (tx): Promise<CreateTripResult> => {
    const overlap = await overlapError(tx, valid.trip);
    if (overlap) return { ok: false, error: overlap };
    const trip = await tx.trip.create({ data: valid.trip, select: { id: true } });
    return { ok: true, tripId: trip.id };
  });

  if (result.ok) revalidateTripRoutes();
  return result;
}

export type TripResult = { ok: true } | { ok: false; error: string };

export async function updateTrip(input: CreateTripInput & { id: string }): Promise<TripResult> {
  await requireAuth();
  const valid = validate(input);
  if (!valid.ok) return valid;
  const { startDate, endDate } = valid.trip;

  // One transaction, so an expense can't be added outside the new dates between check and write.
  const result = await prisma.$transaction(async (tx): Promise<TripResult> => {
    const existing = await tx.trip.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!existing) return { ok: false, error: "That trip no longer exists." };

    const overlap = await overlapError(tx, valid.trip, input.id);
    if (overlap) return { ok: false, error: overlap };

    // Don't strand expenses outside the trip's new dates.
    const outside = await tx.expense.count({
      where: { tripId: input.id, OR: [{ date: { lt: startDate } }, { date: { gt: endDate } }] },
    });
    if (outside > 0) {
      return {
        ok: false,
        error: `${outside} ${outside === 1 ? "expense falls" : "expenses fall"} outside those dates. Move or delete ${outside === 1 ? "it" : "them"} first.`,
      };
    }

    await tx.trip.update({ where: { id: input.id }, data: valid.trip });
    return { ok: true };
  });

  if (result.ok) revalidateTripRoutes();
  return result;
}

/** Deletes the trip and every expense in it. */
export async function deleteTrip(id: string): Promise<TripResult> {
  await requireAuth();
  const { count } = await prisma.trip.deleteMany({ where: { id } });
  if (count === 0) return { ok: false, error: "That trip no longer exists." };
  revalidateTripRoutes();
  return { ok: true };
}
