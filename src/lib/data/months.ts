import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { ensureCurrentMonth } from "@/lib/data/ensureMonth";
import type { Month, MonthExpense } from "@/lib/monthStats";

const expenseInclude = {
  orderBy: [{ date: "asc" as const }, { createdAt: "asc" as const }],
  include: { category: { select: { name: true, color: true, pintPrice: true } } },
};

type ExpenseRow = {
  id: string;
  date: Date;
  amount: { toNumber(): number };
  note: string | null;
  categoryId: string;
  category: { name: string; color: string; pintPrice: { toNumber(): number } | null };
};

function toExpense(e: ExpenseRow): MonthExpense {
  return {
    id: e.id,
    date: dayKey(e.date),
    amount: e.amount.toNumber(),
    note: e.note,
    categoryId: e.categoryId,
    categoryName: e.category.name,
    categoryColor: e.category.color,
    pintPrice: e.category.pintPrice?.toNumber() ?? null,
  };
}

type MonthRow = NonNullable<Awaited<ReturnType<typeof findMonthRow>>>;

function findMonthRow(id: string) {
  return prisma.budgetCycle.findUnique({ where: { id }, include: { expenses: expenseInclude } });
}

function toMonth(row: MonthRow): Month {
  return {
    kind: "month",
    id: row.id,
    name: row.name,
    label: row.label,
    budget: row.startingBudget.toNumber(),
    startDate: dayKey(row.startDate),
    endDate: dayKey(row.endDate),
    bank: row.bank.toNumber(),
    tricount: row.tricount.toNumber(),
    cash: row.cash.toNumber(),
    balancesUpdatedAt: row.balancesUpdatedAt?.toISOString() ?? null,
    rent: row.rent.toNumber(),
    rentDay: row.rentDay,
    expenses: row.expenses.map(toExpense),
  };
}

export async function getMonth(id: string): Promise<Month | null> {
  const row = await findMonthRow(id);
  return row ? toMonth(row) : null;
}

/** A trip, in the same shape as a month (no balances/rent) so stats are shared. */
export async function getTrip(id: string): Promise<Month | null> {
  const trip = await prisma.trip.findUnique({ where: { id }, include: { expenses: expenseInclude } });
  if (!trip) return null;

  return {
    kind: "trip",
    id: trip.id,
    name: trip.name,
    label: "Trip",
    budget: trip.totalBudget.toNumber(),
    startDate: dayKey(trip.startDate),
    endDate: dayKey(trip.endDate),
    bank: 0,
    tricount: 0,
    cash: 0,
    balancesUpdatedAt: null,
    rent: 0,
    rentDay: null,
    expenses: trip.expenses.map(toExpense),
  };
}

export async function getPeriodData(period: { type: "cycle" | "trip"; id: string }) {
  return period.type === "cycle" ? getMonth(period.id) : getTrip(period.id);
}

/** Every trip, oldest first (in the same shape as months). */
export async function getAllTrips(): Promise<Month[]> {
  const trips = await prisma.trip.findMany({ orderBy: { startDate: "asc" }, select: { id: true } });
  const all = await Promise.all(trips.map((t) => getTrip(t.id)));
  return all.filter((t): t is Month => t !== null);
}

/** Every month, oldest first (for comparisons). */
export async function getAllMonths(): Promise<Month[]> {
  await ensureCurrentMonth();
  const rows = await prisma.budgetCycle.findMany({
    orderBy: { startDate: "asc" },
    include: { expenses: expenseInclude },
  });
  return rows.map(toMonth);
}
