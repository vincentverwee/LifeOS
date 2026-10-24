import "server-only";
import { prisma } from "@/lib/prisma";
import type { CategoryColorSlot } from "@/lib/categoryPalette";

export type Category = {
  id: string;
  name: string;
  color: CategoryColorSlot;
  sortOrder: number;
  isArchived: boolean;
  /** Estimated price of one pint; a category with a price counts as beer. */
  pintPrice: number | null;
  expenseCount: number;
  lastUsedAt: string | null;
};

/** Every category (including archived), in the user's order. */
export async function getAllCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { expenses: true } },
      expenses: { take: 1, orderBy: { createdAt: "desc" }, select: { createdAt: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color as CategoryColorSlot,
    sortOrder: row.sortOrder,
    isArchived: row.isArchived,
    pintPrice: row.pintPrice?.toNumber() ?? null,
    expenseCount: row._count.expenses,
    lastUsedAt: row.expenses[0]?.createdAt.toISOString() ?? null,
  }));
}

export async function getActiveCategories(): Promise<Category[]> {
  const categories = await getAllCategories();
  return categories.filter((category) => !category.isArchived);
}

export type EntryDefaults = {
  chips: Category[];
  defaultCategoryId: string | null;
};

/**
 * Pure. The pre-selected default uses recency (most-recently-used — the best
 * guess for "what am I probably logging right now"). The chip row uses
 * frequency (a stable, representative set of common categories that doesn't
 * reshuffle after every save). The MRU category is force-included as the
 * first chip so the pre-selected default is always visible without "more".
 */
export function pickEntryDefaults(usage: Category[], chipCount = 6): EntryDefaults {
  const used = usage.filter((c) => c.expenseCount > 0);
  if (used.length === 0) {
    return { chips: usage.slice(0, chipCount), defaultCategoryId: usage[0]?.id ?? null };
  }

  const mostRecent = [...used].sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))[0];
  const byFrequency = [...used].sort((a, b) => b.expenseCount - a.expenseCount);

  const chips: Category[] = [mostRecent];
  for (const category of byFrequency) {
    if (chips.length >= chipCount) break;
    if (category.id === mostRecent.id) continue;
    chips.push(category);
  }

  return { chips, defaultCategoryId: mostRecent.id };
}
