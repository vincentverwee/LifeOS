"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CreateTripInput = {
  name: string;
  totalBudget: number;
  /** "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
};

export type CreateTripResult = { ok: true; tripId: string } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createTrip(input: CreateTripInput): Promise<CreateTripResult> {
  await requireAuth();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the trip a name." };
  if (!Number.isFinite(input.totalBudget) || input.totalBudget <= 0) {
    return { ok: false, error: "Enter a budget greater than zero." };
  }
  if (!DATE_RE.test(input.startDate) || !DATE_RE.test(input.endDate)) {
    return { ok: false, error: "Pick a start and end date." };
  }
  if (input.endDate < input.startDate) {
    return { ok: false, error: "The end date can't be before the start date." };
  }

  const trip = await prisma.trip.create({
    data: {
      name,
      totalBudget: Math.round(input.totalBudget * 100) / 100,
      startDate: new Date(`${input.startDate}T00:00:00Z`),
      endDate: new Date(`${input.endDate}T00:00:00Z`),
    },
    select: { id: true },
  });

  revalidateTripRoutes();
  return { ok: true, tripId: trip.id };
}

function revalidateTripRoutes() {
  revalidatePath("/budget");
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget/insights");
  revalidatePath("/budget/settings");
}

function validate(input: CreateTripInput): string | null {
  if (!input.name.trim()) return "Give the trip a name.";
  if (!Number.isFinite(input.totalBudget) || input.totalBudget <= 0) {
    return "Enter a budget greater than zero.";
  }
  if (!DATE_RE.test(input.startDate) || !DATE_RE.test(input.endDate)) {
    return "Pick a start and end date.";
  }
  if (input.endDate < input.startDate) return "The end date can't be before the start date.";
  return null;
}

export type TripResult = { ok: true } | { ok: false; error: string };

export async function updateTrip(input: CreateTripInput & { id: string }): Promise<TripResult> {
  await requireAuth();
  const error = validate(input);
  if (error) return { ok: false, error };

  const startDate = new Date(`${input.startDate}T00:00:00Z`);
  const endDate = new Date(`${input.endDate}T00:00:00Z`);
  const existing = await prisma.trip.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!existing) return { ok: false, error: "That trip no longer exists." };

  // Don't strand expenses outside the trip's new dates.
  const outside = await prisma.expense.count({
    where: { tripId: input.id, OR: [{ date: { lt: startDate } }, { date: { gt: endDate } }] },
  });
  if (outside > 0) {
    return {
      ok: false,
      error: `${outside} ${outside === 1 ? "expense falls" : "expenses fall"} outside those dates. Move or delete ${outside === 1 ? "it" : "them"} first.`,
    };
  }

  await prisma.trip.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      totalBudget: Math.round(input.totalBudget * 100) / 100,
      startDate,
      endDate,
    },
  });
  revalidateTripRoutes();
  return { ok: true };
}

/** Deletes the trip and every expense in it. */
export async function deleteTrip(id: string): Promise<TripResult> {
  await requireAuth();
  const existing = await prisma.trip.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "That trip no longer exists." };
  await prisma.trip.delete({ where: { id } });
  revalidateTripRoutes();
  return { ok: true };
}
