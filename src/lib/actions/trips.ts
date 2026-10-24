"use server";

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

  revalidatePath("/budget");
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget/settings");

  return { ok: true, tripId: trip.id };
}
