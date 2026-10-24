import "server-only";
import { format, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { CategoryColorSlot } from "@/lib/categoryPalette";

export type CategorySpendTotal = {
  id: string;
  name: string;
  color: CategoryColorSlot;
  isArchived: boolean;
  totalSpent: number;
  expenseCount: number;
};

/** Global — spans every trip and month. */
export async function getCategorySpendTotals(): Promise<CategorySpendTotal[]> {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { expenses: { select: { amount: true } } },
  });

  return categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color as CategoryColorSlot,
      isArchived: category.isArchived,
      totalSpent: category.expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0),
      expenseCount: category.expenses.length,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export type CategoryExpensePoint = {
  date: string;
  amount: number;
};

export async function getCategoryExpenses(categoryId: string): Promise<CategoryExpensePoint[]> {
  const expenses = await prisma.expense.findMany({
    where: { categoryId },
    orderBy: { date: "asc" },
    select: { date: true, amount: true },
  });

  return expenses.map((expense) => ({
    date: expense.date.toISOString(),
    amount: expense.amount.toNumber(),
  }));
}

export type CategoryTrendPoint = {
  bucket: string;
  amount: number;
};

/** Monthly totals ("yyyy-MM" buckets), oldest first. */
export function computeCategoryTrend(expenses: CategoryExpensePoint[]): CategoryTrendPoint[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const key = format(startOfMonth(new Date(expense.date)), "yyyy-MM");
    totals.set(key, (totals.get(key) ?? 0) + expense.amount);
  }

  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, amount]) => ({ bucket, amount }));
}
