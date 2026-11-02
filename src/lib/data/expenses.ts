import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { dayKey } from "@/lib/format";
import type { Period } from "@/lib/data/periods";
import type { CategoryColorSlot } from "@/lib/categoryPalette";

export type ListExpense = {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  amount: number;
  note: string | null;
  categoryId: string;
  categoryName: string;
  categoryColor: CategoryColorSlot;
  /** Logged from a subscription's renewal. */
  fromSubscription: boolean;
  /** beer only */
  pubId: string | null;
  pubName: string | null;
  pints: number | null;
  /** beer only: ml per beer, null = a pint */
  sizeMl: number | null;
};

const listInclude = { category: { select: { name: true, color: true } }, pub: { select: { name: true } } } as const;

async function listExpenses(args: {
  where: Prisma.ExpenseWhereInput;
  take?: number;
}): Promise<ListExpense[]> {
  const rows = await prisma.expense.findMany({
    where: args.where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: args.take,
    include: listInclude,
  });

  return rows.map((row) => ({
    id: row.id,
    date: dayKey(row.date),
    amount: row.amount.toNumber(),
    note: row.note,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    categoryColor: row.category.color as CategoryColorSlot,
    fromSubscription: row.subscriptionId !== null,
    pubId: row.pubId,
    pubName: row.pub?.name ?? null,
    pints: row.pints,
    sizeMl: row.sizeMl,
  }));
}

/** Newest expenses of a period first; `limit: null` returns all of them. */
export async function getRecentExpenses(period: Period, limit: number | null = 50): Promise<ListExpense[]> {
  return listExpenses({
    where: period.type === "cycle" ? { cycleId: period.id } : { tripId: period.id },
    take: limit ?? undefined,
  });
}

/** The newest beers (expenses in a category with a pint price), newest first. */
export async function getLatestBeers(limit: number): Promise<ListExpense[]> {
  return listExpenses({ where: { category: { pintPrice: { not: null } } }, take: limit });
}
