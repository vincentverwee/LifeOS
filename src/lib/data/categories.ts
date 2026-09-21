import "server-only";
import { prisma } from "@/lib/prisma";
import type { PeriodType } from "@/lib/data/periods";

export type CategoryOption = {
  id: string;
  name: string;
};

function periodWhere(period: { type: PeriodType; id: string }) {
  return period.type === "trip" ? { tripId: period.id } : { cycleId: period.id };
}

export async function getCategoriesForPeriod(period: {
  type: PeriodType;
  id: string;
}): Promise<CategoryOption[]> {
  const categories = await prisma.category.findMany({
    where: periodWhere(period),
    orderBy: { name: "asc" },
  });

  return categories.map((category) => ({ id: category.id, name: category.name }));
}

export type CategoryUsageStat = {
  id: string;
  name: string;
  expenseCount: number;
  lastUsedAt: string | null;
};

export async function getCategoryUsageForPeriod(period: {
  type: PeriodType;
  id: string;
}): Promise<CategoryUsageStat[]> {
  const categories = await prisma.category.findMany({
    where: periodWhere(period),
    orderBy: { name: "asc" },
    include: {
      _count: { select: { expenses: true } },
      expenses: { take: 1, orderBy: { createdAt: "desc" }, select: { createdAt: true } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    expenseCount: category._count.expenses,
    lastUsedAt: category.expenses[0]?.createdAt.toISOString() ?? null,
  }));
}

export type EntryDefaults = {
  chips: CategoryUsageStat[];
  defaultCategoryId: string | null;
};

/**
 * Pure. The pre-selected default uses recency (most-recently-used — the best
 * guess for "what am I probably logging right now"). The chip row uses
 * frequency (a stable, representative set of common categories that doesn't
 * reshuffle after every save). The MRU category is force-included as the
 * first chip so the pre-selected default is always visible without "more".
 */
export function pickEntryDefaults(usage: CategoryUsageStat[], chipCount = 6): EntryDefaults {
  const used = usage.filter((c) => c.expenseCount > 0);
  if (used.length === 0) {
    return { chips: [], defaultCategoryId: null };
  }

  const mostRecent = [...used].sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))[0];
  const byFrequency = [...used].sort((a, b) => b.expenseCount - a.expenseCount);

  const chips: CategoryUsageStat[] = [mostRecent];
  for (const category of byFrequency) {
    if (chips.length >= chipCount) break;
    if (category.id === mostRecent.id) continue;
    chips.push(category);
  }

  return { chips, defaultCategoryId: mostRecent.id };
}
