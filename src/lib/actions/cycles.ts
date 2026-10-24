"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function revalidateMonthRoutes() {
  revalidatePath("/budget");
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget/insights");
  revalidatePath("/budget/settings");
}

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
  for (const value of [input.bank, input.tricount, input.cash]) {
    if (!Number.isFinite(value)) return { ok: false, error: "Enter valid amounts." };
  }

  const existing = await prisma.budgetCycle.findUnique({
    where: { id: input.cycleId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "That month no longer exists." };

  await prisma.budgetCycle.update({
    where: { id: input.cycleId },
    data: {
      bank: Math.round(input.bank * 100) / 100,
      tricount: Math.round(input.tricount * 100) / 100,
      cash: Math.round(input.cash * 100) / 100,
      balancesUpdatedAt: new Date(),
    },
  });

  revalidateMonthRoutes();
  return { ok: true, cycleId: input.cycleId };
}

export type UpdateRentInput = { cycleId: string; rent: number; rentDay: number | null };

export async function updateRent(input: UpdateRentInput): Promise<CycleResult> {
  if (!Number.isFinite(input.rent) || input.rent < 0) {
    return { ok: false, error: "Rent can't be negative." };
  }
  if (
    input.rentDay !== null &&
    (!Number.isInteger(input.rentDay) || input.rentDay < 1 || input.rentDay > 31)
  ) {
    return { ok: false, error: "Rent day must be between 1 and 31." };
  }

  const existing = await prisma.budgetCycle.findUnique({
    where: { id: input.cycleId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "That month no longer exists." };

  await prisma.budgetCycle.update({
    where: { id: input.cycleId },
    data: { rent: Math.round(input.rent * 100) / 100, rentDay: input.rentDay },
  });

  revalidateMonthRoutes();
  return { ok: true, cycleId: input.cycleId };
}

export async function updateMonthBudget(input: {
  cycleId: string;
  budget: number;
}): Promise<CycleResult> {
  if (!Number.isFinite(input.budget) || input.budget <= 0) {
    return { ok: false, error: "Enter a budget greater than zero." };
  }

  const existing = await prisma.budgetCycle.findUnique({
    where: { id: input.cycleId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "That month no longer exists." };

  await prisma.budgetCycle.update({
    where: { id: input.cycleId },
    data: { startingBudget: Math.round(input.budget * 100) / 100 },
  });

  revalidateMonthRoutes();
  return { ok: true, cycleId: input.cycleId };
}

export async function setPeriodLabel(input: { cycleId: string; label: string }): Promise<CycleResult> {
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Give the label a name." };
  if (label.length > 24) return { ok: false, error: "Keep the label under 24 characters." };

  const existing = await prisma.budgetCycle.findUnique({
    where: { id: input.cycleId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "That month no longer exists." };

  await prisma.budgetCycle.update({ where: { id: input.cycleId }, data: { label } });
  revalidateMonthRoutes();
  return { ok: true, cycleId: input.cycleId };
}
