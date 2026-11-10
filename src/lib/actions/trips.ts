"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { validate, overlapError, strandedError, type CreateTripInput } from "@/lib/budgetTrips";

export type { CreateTripInput };

export type CreateTripResult = { ok: true; tripId: string } | { ok: false; error: string };

function revalidateTripRoutes() {
  revalidatePath("/"); // hub shows the running trip
  revalidatePath("/budget");
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget/insights");
  revalidatePath("/budget/settings");
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

    const stranded = await strandedError(tx, input.id, startDate, endDate);
    if (stranded) return { ok: false, error: stranded };

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
