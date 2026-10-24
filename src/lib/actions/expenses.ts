"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/format";

function revalidateExpenseRoutes() {
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget");
  revalidatePath("/budget/insights");
}

// Date-only values are stored as UTC midnight (@db.Date), so "2026-10-24"
// must be parsed as UTC to avoid drifting a day in other timezones.
function parseDateOnly(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export type ExpensePeriod = { type: "cycle" | "trip"; id: string };

async function periodExists(period: ExpensePeriod): Promise<boolean> {
  const row =
    period.type === "trip"
      ? await prisma.trip.findUnique({ where: { id: period.id }, select: { id: true } })
      : await prisma.budgetCycle.findUnique({ where: { id: period.id }, select: { id: true } });
  return row !== null;
}

export type CreateExpenseInput = {
  period: ExpensePeriod;
  categoryId: string;
  amount: number;
  date?: string;
  note?: string | null;
};

export type CreateExpenseResult =
  | { ok: true; expenseId: string }
  | { ok: false; error: string };

export async function createExpense(input: CreateExpenseInput): Promise<CreateExpenseResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  const [category, hasPeriod] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    periodExists(input.period),
  ]);
  if (!category) return { ok: false, error: "That category no longer exists." };
  if (!hasPeriod) return { ok: false, error: "That month or trip no longer exists." };

  const expense = await prisma.expense.create({
    data: {
      categoryId: category.id,
      tripId: input.period.type === "trip" ? input.period.id : null,
      cycleId: input.period.type === "cycle" ? input.period.id : null,
      amount: Math.round(input.amount * 100) / 100,
      date: parseDateOnly(input.date),
      note: input.note?.trim() || null,
    },
    select: { id: true },
  });

  revalidateExpenseRoutes();
  return { ok: true, expenseId: expense.id };
}

export type CreateExpenseFormState = CreateExpenseResult | null;

export async function createExpenseFromForm(
  _prevState: CreateExpenseFormState,
  formData: FormData
): Promise<CreateExpenseFormState> {
  const categoryId = String(formData.get("categoryId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const note = formData.get("note");
  const date = formData.get("date");
  const periodType = formData.get("periodType");
  const periodId = String(formData.get("periodId") ?? "");

  if (!categoryId) return { ok: false, error: "Pick a category first." };
  if ((periodType !== "cycle" && periodType !== "trip") || !periodId) {
    return { ok: false, error: "Pick a month or trip first." };
  }

  const amount = parseAmount(amountRaw);
  if (amount === null) {
    return { ok: false, error: "Enter a valid amount, e.g. 6,80 or 6,8+7,4." };
  }

  return createExpense({
    period: { type: periodType, id: periodId },
    categoryId,
    amount,
    date: typeof date === "string" ? date : undefined,
    note: typeof note === "string" ? note : null,
  });
}

export type UpdateExpenseInput = {
  id: string;
  categoryId: string;
  amount: number;
  date: string;
  note?: string | null;
};

export type ExpenseMutationResult = { ok: true } | { ok: false; error: string };

export async function updateExpense(input: UpdateExpenseInput): Promise<ExpenseMutationResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  const [existing, category] = await Promise.all([
    prisma.expense.findUnique({ where: { id: input.id }, select: { id: true } }),
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
  ]);
  if (!existing) return { ok: false, error: "That expense no longer exists." };
  if (!category) return { ok: false, error: "That category no longer exists." };

  await prisma.expense.update({
    where: { id: input.id },
    data: {
      categoryId: category.id,
      amount: Math.round(input.amount * 100) / 100,
      date: parseDateOnly(input.date),
      note: input.note?.trim() || null,
    },
  });

  revalidateExpenseRoutes();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ExpenseMutationResult> {
  const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "That expense no longer exists." };

  await prisma.expense.delete({ where: { id } });
  revalidateExpenseRoutes();
  return { ok: true };
}
