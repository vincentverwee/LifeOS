import "server-only";
import { prisma } from "@/lib/prisma";
import type { TagColorSlot } from "@/lib/tagPalette";

export type Tag = {
  id: string;
  name: string;
  color: TagColorSlot;
  sortOrder: number;
  isArchived: boolean;
  expenseCount: number;
};

export async function getAllTags(): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { expenses: true } } },
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color as TagColorSlot,
    sortOrder: tag.sortOrder,
    isArchived: tag.isArchived,
    expenseCount: tag._count.expenses,
  }));
}

export async function getActiveTags(): Promise<Tag[]> {
  const tags = await getAllTags();
  return tags.filter((tag) => !tag.isArchived);
}

export function resolveActiveTag(tags: Tag[], requestedId: string | undefined): Tag | null {
  if (tags.length === 0) return null;
  if (requestedId) {
    const match = tags.find((tag) => tag.id === requestedId);
    if (match) return match;
  }
  return tags[0];
}
