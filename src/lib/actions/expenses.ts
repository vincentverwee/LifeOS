"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MAX_AMOUNT, formatDate, parseAmount, parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { ensureMonthFor } from "@/lib/data/ensureMonth";
import { knownError } from "@/lib/prismaErrors";
import { Prisma } from "@/generated/prisma/client";

function revalidateExpenseRoutes() {
  revalidatePath("/"); // hub shows "left today"
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget");
  revalidatePath("/budget/insights");
  revalidatePath("/budget/settings"); // spent per month/trip
}

// Date-only values are stored as UTC midnight (@db.Date), so "2026-10-24"
// must be parsed as UTC to avoid drifting a day in other timezones.
function utcDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function checkAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount greater than zero.";
  if (amount > MAX_AMOUNT) return "That amount is too large.";
  return null;
}

const toCents = (amount: number) => Math.round(amount * 100) / 100;

export type ExpensePeriod = { type: "cycle" | "trip"; id: string };

type Target =
  | { ok: true; period: ExpensePeriod; name: string }
  | { ok: false; error: string };

/**
 * Where an expense on `date` belongs. A trip keeps it only inside its dates.
 * For months the date decides: "yesterday" on the 1st goes to last month.
 */
async function resolveTarget(period: ExpensePeriod, date: Date, todayKey: string): Promise<Target> {
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

  // Dates in a month that doesn't exist yet (next month, or one the app was never opened in).
  await ensureMonthFor(date.toISOString().slice(0, 10), todayKey);
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
  /**
   * A UUID made on the phone, used as the expense's id so a retried save (offline
   * queue, or a reply lost on a bad connection) can never create it twice.
   */
  clientId?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const amountError = checkAmount(input.amount);
  if (amountError) return { ok: false, error: amountError };
  const clientId = input.clientId && UUID.test(input.clientId) ? input.clientId.toLowerCase() : undefined;

  // Already saved by an earlier attempt: report success again instead of a duplicate.
  if (clientId && (await prisma.expense.findUnique({ where: { id: clientId }, select: { id: true } }))) {
    return { ok: true, expenseId: clientId, movedTo: null };
  }

  // No date (the form sends "" before hydration) means today; a bad one is an error.
  const todayKey = await getTodayKey();
  const dateKey = input.date ? parseDateKey(input.date) : todayKey;
  if (!dateKey) return { ok: false, error: "Pick a valid date." };
  const date = utcDate(dateKey);

  const [category, target] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    resolveTarget(input.period, date, todayKey),
  ]);
  if (!category) return { ok: false, error: "That category no longer exists." };
  if (!target.ok) return target;

  let expense: { id: string };
  try {
    expense = await prisma.expense.create({
      data: {
        ...(clientId && { id: clientId }),
        categoryId: category.id,
        tripId: target.period.type === "trip" ? target.period.id : null,
        cycleId: target.period.type === "cycle" ? target.period.id : null,
        amount: toCents(input.amount),
        date,
        note: input.note?.trim().slice(0, 500) || null,
      },
      select: { id: true },
    });
  } catch (e) {
    // Two attempts with the same clientId raced; the other one saved it.
    if (clientId && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: true, expenseId: clientId, movedTo: null };
    }
    throw e;
  }

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
    clientId: String(formData.get("clientId") ?? "") || undefined,
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

export type UpdateExpenseResult =
  | {
      ok: true;
      /** set when the new date moved the expense to another month */
      movedTo: string | null;
    }
  | { ok: false; error: string };

export async function updateExpense(input: UpdateExpenseInput): Promise<UpdateExpenseResult> {
  await requireAuth();
  const amountError = checkAmount(input.amount);
  if (amountError) return { ok: false, error: amountError };
  // Editing never falls back to today: a cleared date field is a mistake, not "today".
  const dateKey = parseDateKey(input.date);
  if (!dateKey) return { ok: false, error: "Pick a valid date." };

  const [existing, category] = await Promise.all([
    prisma.expense.findUnique({ where: { id: input.id }, select: { cycleId: true, tripId: true } }),
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
  ]);
  if (!existing) return { ok: false, error: "That expense no longer exists." };
  if (!category) return { ok: false, error: "That category no longer exists." };

  // A new date can move the expense to another month (trips must contain it).
  const date = utcDate(dateKey);
  const current: ExpensePeriod | null = existing.tripId
    ? { type: "trip", id: existing.tripId }
    : existing.cycleId
      ? { type: "cycle", id: existing.cycleId }
      : null;
  const target = current ? await resolveTarget(current, date, await getTodayKey()) : null;
  if (target && !target.ok) return target;

  try {
    await prisma.expense.update({
      where: { id: input.id },
      data: {
        categoryId: category.id,
        amount: toCents(input.amount),
        date,
        note: input.note?.trim().slice(0, 500) || null,
        ...(target?.ok && target.period.type === "cycle" ? { cycleId: target.period.id } : {}),
      },
    });
  } catch (e) {
    return knownError(e, { P2025: "That expense no longer exists.", P2003: "That category no longer exists." });
  }

  revalidateExpenseRoutes();
  return { ok: true, movedTo: target?.ok && target.period.id !== current?.id ? target.name : null };
}

export async function deleteExpense(id: string): Promise<ExpenseMutationResult> {
  await requireAuth();
  const { count } = await prisma.expense.deleteMany({ where: { id } });
  if (count === 0) return { ok: false, error: "That expense no longer exists." };
  revalidateExpenseRoutes();
  return { ok: true };
}
