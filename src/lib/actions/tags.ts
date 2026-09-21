"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isTagColorSlot, type TagColorSlot } from "@/lib/tagPalette";
import type { Tag } from "@/lib/data/tags";

function toTag(row: {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isArchived: boolean;
  _count: { expenses: number };
}): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color as TagColorSlot,
    sortOrder: row.sortOrder,
    isArchived: row.isArchived,
    expenseCount: row._count.expenses,
  };
}

function revalidateTagRoutes() {
  revalidatePath("/tags");
  revalidatePath("/expenses");
  revalidatePath("/insights");
}

export type TagResult = { ok: true; tag: Tag } | { ok: false; error: string };

async function assertUniqueName(name: string, excludeId?: string) {
  const existing = await prisma.tag.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, id: excludeId ? { not: excludeId } : undefined },
    select: { id: true },
  });
  return existing === null;
}

export type CreateTagInput = { name: string; color: string };

export async function createTag(input: CreateTagInput): Promise<TagResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Tag name can't be empty." };
  if (!isTagColorSlot(input.color)) return { ok: false, error: "Pick a color." };
  if (!(await assertUniqueName(name))) {
    return { ok: false, error: `"${name}" already exists.` };
  }

  const last = await prisma.tag.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });

  const tag = await prisma.tag.create({
    data: { name, color: input.color, sortOrder: (last?.sortOrder ?? -10) + 10 },
    include: { _count: { select: { expenses: true } } },
  });

  revalidateTagRoutes();
  return { ok: true, tag: toTag(tag) };
}

export type UpdateTagInput = { id: string; name?: string; color?: string };

export async function updateTag(input: UpdateTagInput): Promise<TagResult> {
  const data: { name?: string; color?: string } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Tag name can't be empty." };
    if (!(await assertUniqueName(name, input.id))) {
      return { ok: false, error: `"${name}" already exists.` };
    }
    data.name = name;
  }

  if (input.color !== undefined) {
    if (!isTagColorSlot(input.color)) return { ok: false, error: "Pick a color." };
    data.color = input.color;
  }

  const tag = await prisma.tag.update({
    where: { id: input.id },
    data,
    include: { _count: { select: { expenses: true } } },
  });

  revalidateTagRoutes();
  return { ok: true, tag: toTag(tag) };
}

export type ReorderTagsInput = { orderedIds: string[] };

export async function reorderTags(
  input: ReorderTagsInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.tag.update({ where: { id }, data: { sortOrder: index * 10 } })
    )
  );

  revalidateTagRoutes();
  return { ok: true };
}

export async function archiveTag(input: { id: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  await prisma.tag.update({ where: { id: input.id }, data: { isArchived: true } });
  revalidateTagRoutes();
  return { ok: true };
}

export async function unarchiveTag(input: { id: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  await prisma.tag.update({ where: { id: input.id }, data: { isArchived: false } });
  revalidateTagRoutes();
  return { ok: true };
}

export async function deleteTag(input: { id: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const usage = await prisma.tag.findUnique({
    where: { id: input.id },
    select: { _count: { select: { expenses: true } } },
  });

  if (!usage) return { ok: false, error: "Tag not found." };
  if (usage._count.expenses > 0) {
    return { ok: false, error: "This tag is in use — archive it instead of deleting it." };
  }

  await prisma.tag.delete({ where: { id: input.id } });
  revalidateTagRoutes();
  return { ok: true };
}
