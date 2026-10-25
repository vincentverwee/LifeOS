"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MAX_AMOUNT } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

function revalidateMonthRoutes() {
  revalidatePath("/"); // hub shows "left today"
  revalidatePath("/budget");
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget/insights");
  revalidatePath("/budget/settings");
}

/** One write; false when the month was deleted in the meantime. */
async function updateCycle(id: string, data: Prisma.BudgetCycleUpdateManyMutationInput): Promise<boolean> {
  const { count } = await prisma.budgetCycle.updateMany({ where: { id }, data });
  return count > 0;
}

const inRange = (value: number) => Number.isFinite(value) && Math.abs(value) <= MAX_AMOUNT;

export type CycleResult = { ok: true; cycleId: string } | { ok: false; error: string };

export type UpdateBalancesInput = {
  cycleId: string;
  bank: number;
  tricount: number;
  cash: number;
};

// Balances are really "what I have right now", so a month that gets
// auto-created later inherits the latest value.
export async function updateBalances(input: UpdateBalancesInput): Promise<CycleResult> {
  await requireAuth();
  for (const value of [input.bank, input.tricount, input.cash]) {
    if (!inRange(value)) return { ok: false, error: "Enter valid amounts." };
  }

  if (!(await updateCycle(input.cycleId, {
      bank: Math.round(input.bank * 100) / 100,
      tricount: Math.round(input.tricount * 100) / 100,
      cash: Math.round(input.cash * 100) / 100,
      balancesUpdatedAt: new Date(),
    }))) {
    return { ok: false, error: "That month no longer exists." };
  }

  revalidateMonthRoutes();
  return { ok: true, cycleId: input.cycleId };
}

export type UpdateRentInput = { cycleId: string; rent: number; rentDay: number | null };

export async function updateRent(input: UpdateRentInput): Promise<CycleResult> {
  await requireAuth();
  if (!inRange(input.rent) || input.rent < 0) {
    return { ok: false, error: "Rent can't be negative." };
  }
  if (
    input.rentDay !== null &&
    (!Number.isInteger(input.rentDay) || input.rentDay < 1 || input.rentDay > 31)
  ) {
    return { ok: false, error: "Rent day must be between 1 and 31." };
  }

  if (!(await updateCycle(input.cycleId, { rent: Math.round(input.rent * 100) / 100, rentDay: input.rentDay }))) {
    return { ok: false, error: "That month no longer exists." };
  }

  revalidateMonthRoutes();
  return { ok: true, cycleId: input.cycleId };
}

export async function updateMonthBudget(input: {
  cycleId: string;
  budget: number;
}): Promise<CycleResult> {
  await requireAuth();
  if (!inRange(input.budget) || input.budget <= 0) {
    return { ok: false, error: "Enter a budget greater than zero." };
  }

  if (!(await updateCycle(input.cycleId, { startingBudget: Math.round(input.budget * 100) / 100 }))) {
    return { ok: false, error: "That month no longer exists." };
  }

  revalidateMonthRoutes();
  return { ok: true, cycleId: input.cycleId };
}

export async function setPeriodLabel(input: { cycleId: string; label: string }): Promise<CycleResult> {
  await requireAuth();
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Give the label a name." };
  if (label.length > 24) return { ok: false, error: "Keep the label under 24 characters." };

  if (!(await updateCycle(input.cycleId, { label }))) {
    return { ok: false, error: "That month no longer exists." };
  }
  revalidateMonthRoutes();
  return { ok: true, cycleId: input.cycleId };
}
