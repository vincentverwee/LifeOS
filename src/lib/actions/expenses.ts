"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatDate, parseAmount } from "@/lib/format";
import { getTodayKey } from "@/lib/today";

function revalidateExpenseRoutes() {
  revalidatePath("/"); // hub shows "left today"
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget");
  revalidatePath("/budget/insights");
}

// Date-only values are stored as UTC midnight (@db.Date), so "2026-10-24"
// must be parsed as UTC to avoid drifting a day in other timezones.
async function parseDateOnly(value: string | undefined): Promise<Date> {
  const key = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : await getTodayKey();
  return new Date(`${key}T00:00:00Z`);
}

export type ExpensePeriod = { type: "cycle" | "trip"; id: string };

type Target =
  | { ok: true; period: ExpensePeriod; name: string }
  | { ok: false; error: string };

/**
 * Where an expense on `date` belongs. A trip keeps it only inside its dates.
 * For months the date decides: "yesterday" on the 1st goes to last month.
 */
async function resolveTarget(period: ExpensePeriod, date: Date): Promise<Target> {
  if (period.type === "trip") {
    const trip = await prisma.trip.findUnique({
      where: { id: period.id },
      select: { name: true, startDate: true, endDate: true },
    });
    if (!trip) return { ok: false, error: "That trip no longer exists." };
    if (date < trip.startDate || date > trip.endDate) {
      return {
        ok: false,
        error: `${trip.name} runs ${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}; pick a date in that range.`,
      };
    }
    return { ok: true, period, name: trip.name };
  }

  const cycle = await prisma.budgetCycle.findUnique({
    where: { id: period.id },
    select: { name: true, startDate: true, endDate: true },
  });
  if (!cycle) return { ok: false, error: "That month no longer exists." };
  if (date >= cycle.startDate && date <= cycle.endDate) return { ok: true, period, name: cycle.name };

  const covering = await prisma.budgetCycle.findFirst({
    where: { startDate: { lte: date }, endDate: { gte: date } },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true },
  });
  if (!covering) return { ok: false, error: `No month covers ${formatDate(date)}.` };
  return { ok: true, period: { type: "cycle", id: covering.id }, name: covering.name };
}

export type CreateExpenseInput = {
  period: ExpensePeriod;
  categoryId: string;
  amount: number;
  date?: string;
  note?: string | null;
};

export type CreateExpenseResult =
  | {
      ok: true;
      expenseId: string;
      /** set when the date put the expense in another month than the one picked */
      movedTo: string | null;
    }
  | { ok: false; error: string };

export async function createExpense(input: CreateExpenseInput): Promise<CreateExpenseResult> {
  await requireAuth();
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  const date = await parseDateOnly(input.date);
  const [category, target] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    resolveTarget(input.period, date),
  ]);
  if (!category) return { ok: false, error: "That category no longer exists." };
  if (!target.ok) return target;

  const expense = await prisma.expense.create({
    data: {
      categoryId: category.id,
      tripId: target.period.type === "trip" ? target.period.id : null,
      cycleId: target.period.type === "cycle" ? target.period.id : null,
      amount: Math.round(input.amount * 100) / 100,
      date,
      note: input.note?.trim() || null,
    },
    select: { id: true },
  });

  revalidateExpenseRoutes();
  return {
    ok: true,
    expenseId: expense.id,
    movedTo: target.period.id !== input.period.id ? target.name : null,
  };
}

export type CreateExpenseFormState = CreateExpenseResult | null;

export async function createExpenseFromForm(
  _prevState: CreateExpenseFormState,
  formData: FormData
): Promise<CreateExpenseFormState> {
  await requireAuth();
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
  await requireAuth();
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  const [existing, category] = await Promise.all([
    prisma.expense.findUnique({ where: { id: input.id }, select: { cycleId: true, tripId: true } }),
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
  ]);
  if (!existing) return { ok: false, error: "That expense no longer exists." };
  if (!category) return { ok: false, error: "That category no longer exists." };

  // A new date can move the expense to another month (trips must contain it).
  const date = await parseDateOnly(input.date);
  const current: ExpensePeriod | null = existing.tripId
    ? { type: "trip", id: existing.tripId }
    : existing.cycleId
      ? { type: "cycle", id: existing.cycleId }
      : null;
  const target = current ? await resolveTarget(current, date) : null;
  if (target && !target.ok) return target;

  await prisma.expense.update({
    where: { id: input.id },
    data: {
      categoryId: category.id,
      amount: Math.round(input.amount * 100) / 100,
      date,
      note: input.note?.trim() || null,
      ...(target?.ok && target.period.type === "cycle" ? { cycleId: target.period.id } : {}),
    },
  });

  revalidateExpenseRoutes();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ExpenseMutationResult> {
  await requireAuth();
  const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "That expense no longer exists." };

  await prisma.expense.delete({ where: { id } });
  revalidateExpenseRoutes();
  return { ok: true };
}
