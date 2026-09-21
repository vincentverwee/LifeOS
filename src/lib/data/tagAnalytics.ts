import "server-only";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { TagColorSlot } from "@/lib/tagPalette";

export type TagSpendTotal = {
  id: string;
  name: string;
  color: TagColorSlot;
  isArchived: boolean;
  totalSpent: number;
  expenseCount: number;
};

/** Global — spans every trip and cycle, not scoped to the active period. */
export async function getTagSpendTotals(): Promise<TagSpendTotal[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { sortOrder: "asc" },
    include: { expenses: { select: { amount: true } } },
  });

  return tags
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color as TagColorSlot,
      isArchived: tag.isArchived,
      totalSpent: tag.expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0),
      expenseCount: tag.expenses.length,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export type TagExpensePoint = {
  date: string;
  amount: number;
};

/** Global — every expense tagged with this tag, regardless of period. */
export async function getTagExpenses(tagId: string): Promise<TagExpensePoint[]> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    include: { expenses: { orderBy: { date: "asc" }, select: { date: true, amount: true } } },
  });
  if (!tag) return [];

  return tag.expenses.map((expense) => ({
    date: expense.date.toISOString(),
    amount: expense.amount.toNumber(),
  }));
}

export type TagTrendPoint = {
  bucket: string;
  amount: number;
};

export function computeTagTrend(
  expenses: TagExpensePoint[],
  bucket: "week" | "month" = "month"
): TagTrendPoint[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const date = new Date(expense.date);
    const bucketStart = bucket === "month" ? startOfMonth(date) : startOfWeek(date);
    const key = format(bucketStart, bucket === "month" ? "yyyy-MM" : "yyyy-MM-dd");
    totals.set(key, (totals.get(key) ?? 0) + expense.amount);
  }

  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucketKey, amount]) => ({ bucket: bucketKey, amount }));
}
