import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { ensureCurrentMonth } from "@/lib/data/ensureMonth";
import type { Month, MonthExpense } from "@/lib/monthStats";

const expenseInclude = {
  orderBy: [{ date: "asc" as const }, { createdAt: "asc" as const }],
  include: { category: { select: { name: true, color: true, pintPrice: true } }, pub: { select: { name: true } } },
};

type ExpenseRow = {
  id: string;
  date: Date;
  amount: { toNumber(): number };
  note: string | null;
  categoryId: string;
  category: { name: string; color: string; pintPrice: { toNumber(): number } | null };
  pints: number | null;
  pub: { name: string } | null;
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
    pints: e.pints,
    pubName: e.pub?.name ?? null,
  };
}

type MonthRow = NonNullable<Awaited<ReturnType<typeof findMonthRow>>>;

function findMonthRow(id: string) {
  return prisma.budgetCycle.findUnique({ where: { id }, include: { expenses: expenseInclude } });
}

function toMonth(row: Omit<MonthRow, "expenses">, expenses: MonthExpense[]): Month {
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
    expenses,
  };
}

export async function getMonth(id: string): Promise<Month | null> {
  const row = await findMonthRow(id);
  return row ? toMonth(row, row.expenses.map(toExpense)) : null;
}

type TripRow = {
  id: string;
  name: string;
  totalBudget: { toNumber(): number };
  startDate: Date;
  endDate: Date;
};

/** A trip, in the same shape as a month (no balances/rent) so stats are shared. */
function toTripMonth(trip: TripRow, expenses: MonthExpense[]): Month {
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
    expenses,
  };
}

export async function getTrip(id: string): Promise<Month | null> {
  const trip = await prisma.trip.findUnique({ where: { id }, include: { expenses: expenseInclude } });
  return trip ? toTripMonth(trip, trip.expenses.map(toExpense)) : null;
}

export async function getPeriodData(period: { type: "cycle" | "trip"; id: string }) {
  return period.type === "cycle" ? getMonth(period.id) : getTrip(period.id);
}

/** Every trip, oldest first (in the same shape as months). */
export async function getAllTrips(): Promise<Month[]> {
  const trips = await prisma.trip.findMany({ orderBy: { startDate: "asc" }, include: { expenses: expenseInclude } });
  return trips.map((t) => toTripMonth(t, t.expenses.map(toExpense)));
}

/** Every month, oldest first (for comparisons). */
export async function getAllMonths(): Promise<Month[]> {
  await ensureCurrentMonth();
  const rows = await prisma.budgetCycle.findMany({
    orderBy: { startDate: "asc" },
    include: { expenses: expenseInclude },
  });
  return rows.map((row) => toMonth(row, row.expenses.map(toExpense)));
}

/**
 * Every month and trip (oldest first) with their expenses summed per day and
 * category instead of one row per purchase: three small queries however much
 * history there is. Totals, daily/cumulative curves and category stats come out
 * the same as with the real rows; notes, beer counts and top purchases don't,
 * so load the period you show in detail with getPeriodData().
 */
export async function getPeriodSummaries(): Promise<Month[]> {
  await ensureCurrentMonth();
  const [cycles, trips, categories, sums] = await Promise.all([
    prisma.budgetCycle.findMany({ orderBy: { startDate: "asc" } }),
    prisma.trip.findMany({ orderBy: { startDate: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true, color: true, pintPrice: true } }),
    prisma.expense.groupBy({
      by: ["cycleId", "tripId", "date", "categoryId"],
      _sum: { amount: true, pints: true },
      orderBy: [{ date: "asc" }],
    }),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const byPeriod = new Map<string, MonthExpense[]>();
  for (const g of sums) {
    const periodId = g.cycleId ?? g.tripId;
    const category = categoryById.get(g.categoryId);
    if (!periodId || !category) continue;
    const date = dayKey(g.date);
    const list = byPeriod.get(periodId) ?? [];
    list.push({
      id: `${periodId}:${date}:${g.categoryId}`,
      date,
      amount: g._sum.amount?.toNumber() ?? 0,
      note: null,
      categoryId: g.categoryId,
      categoryName: category.name,
      categoryColor: category.color,
      pintPrice: category.pintPrice?.toNumber() ?? null,
      // Counted pints of the day (a mix with uncounted beers undercounts the guess).
      pints: g._sum.pints,
      pubName: null,
    });
    byPeriod.set(periodId, list);
  }

  return [
    ...cycles.map((c) => toMonth(c, byPeriod.get(c.id) ?? [])),
    ...trips.map((t) => toTripMonth(t, byPeriod.get(t.id) ?? [])),
  ].sort((a, b) => a.startDate.localeCompare(b.startDate));
}
