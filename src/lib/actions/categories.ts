"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { knownError } from "@/lib/prismaErrors";
import {
  CATEGORY_COLOR_SLOTS,
  isCategoryColorSlot,
  type CategoryColorSlot,
} from "@/lib/categoryPalette";

export type CategoryDto = {
  id: string;
  name: string;
  color: CategoryColorSlot;
  isArchived: boolean;
  pintPrice: number | null;
};

function toDto(row: {
  id: string;
  name: string;
  color: string;
  isArchived: boolean;
  pintPrice: { toNumber(): number } | null;
}): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    color: row.color as CategoryColorSlot,
    isArchived: row.isArchived,
    pintPrice: row.pintPrice?.toNumber() ?? null,
  };
}

function revalidateCategoryRoutes() {
  revalidatePath("/budget");
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget/insights");
}

async function isNameFree(name: string, excludeId?: string) {
  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, id: excludeId ? { not: excludeId } : undefined },
    select: { id: true },
  });
  return existing === null;
}

export type CategoryResult = { ok: true; category: CategoryDto } | { ok: false; error: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function createCategory(input: {
  name: string;
  color?: string;
}): Promise<CategoryResult> {
  await requireAuth();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Category name can't be empty." };
  if (name.length > 60) return { ok: false, error: "Keep the name under 60 characters." };
  if (input.color !== undefined && !isCategoryColorSlot(input.color)) {
    return { ok: false, error: "Pick a color." };
  }

  const [free, last, count] = await Promise.all([
    isNameFree(name),
    prisma.category.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } }),
    prisma.category.count(),
  ]);
  if (!free) return { ok: false, error: `"${name}" already exists.` };

  let category;
  try {
    category = await prisma.category.create({
      data: {
        name,
        color: input.color ?? CATEGORY_COLOR_SLOTS[count % CATEGORY_COLOR_SLOTS.length],
        sortOrder: (last?.sortOrder ?? -10) + 10,
      },
    });
  } catch (e) {
    return knownError(e, { P2002: `"${name}" already exists.` });
  }

  revalidateCategoryRoutes();
  return { ok: true, category: toDto(category) };
}

export type UpdateCategoryInput = {
  id: string;
  name?: string;
  color?: string;
  /** null clears it (the category stops counting as beer) */
  pintPrice?: number | null;
};

export async function updateCategory(input: UpdateCategoryInput): Promise<CategoryResult> {
  await requireAuth();
  const data: { name?: string; color?: string; pintPrice?: number | null } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Category name can't be empty." };
    if (name.length > 60) return { ok: false, error: "Keep the name under 60 characters." };
    if (!(await isNameFree(name, input.id))) return { ok: false, error: `"${name}" already exists.` };
    data.name = name;
  }
  if (input.color !== undefined) {
    if (!isCategoryColorSlot(input.color)) return { ok: false, error: "Pick a color." };
    data.color = input.color;
  }
  if (input.pintPrice !== undefined) {
    if (input.pintPrice !== null && !(input.pintPrice > 0)) {
      return { ok: false, error: "Pint price must be greater than zero." };
    }
    data.pintPrice = input.pintPrice;
  }

  let category;
  try {
    category = await prisma.category.update({ where: { id: input.id }, data });
  } catch (e) {
    return knownError(e, { P2025: "That category no longer exists.", P2002: `"${data.name}" already exists.` });
  }
  revalidateCategoryRoutes();
  return { ok: true, category: toDto(category) };
}

export async function reorderCategories(input: { orderedIds: string[] }): Promise<SimpleResult> {
  await requireAuth();
  const ids = input.orderedIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length) {
    return { ok: false, error: "Couldn't save that order." };
  }
  // updateMany: an id deleted in the meantime is skipped instead of failing the batch.
  await prisma.$transaction(
    ids.map((id, index) => prisma.category.updateMany({ where: { id }, data: { sortOrder: index * 10 } }))
  );
  revalidateCategoryRoutes();
  return { ok: true };
}

export async function setCategoryArchived(input: {
  id: string;
  archived: boolean;
}): Promise<SimpleResult> {
  await requireAuth();
  const { count } = await prisma.category.updateMany({
    where: { id: input.id },
    data: { isArchived: input.archived },
  });
  if (count === 0) return { ok: false, error: "That category no longer exists." };
  revalidateCategoryRoutes();
  return { ok: true };
}

export async function deleteCategory(input: { id: string }): Promise<SimpleResult> {
  await requireAuth();
  // The database refuses (onDelete: Restrict) while expenses still use it.
  try {
    await prisma.category.delete({ where: { id: input.id } });
  } catch (e) {
    return knownError(e, {
      P2003: "This category has expenses — archive it instead of deleting it.",
      P2025: "That category no longer exists.",
    });
  }
  revalidateCategoryRoutes();
  return { ok: true };
}
