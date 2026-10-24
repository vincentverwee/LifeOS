"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Category name can't be empty." };
  if (!(await isNameFree(name))) return { ok: false, error: `"${name}" already exists.` };
  if (input.color !== undefined && !isCategoryColorSlot(input.color)) {
    return { ok: false, error: "Pick a color." };
  }

  const last = await prisma.category.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const count = await prisma.category.count();

  const category = await prisma.category.create({
    data: {
      name,
      color: input.color ?? CATEGORY_COLOR_SLOTS[count % CATEGORY_COLOR_SLOTS.length],
      sortOrder: (last?.sortOrder ?? -10) + 10,
    },
  });

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
  const data: { name?: string; color?: string; pintPrice?: number | null } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Category name can't be empty." };
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

  const existing = await prisma.category.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!existing) return { ok: false, error: "That category no longer exists." };

  const category = await prisma.category.update({ where: { id: input.id }, data });
  revalidateCategoryRoutes();
  return { ok: true, category: toDto(category) };
}

export async function reorderCategories(input: { orderedIds: string[] }): Promise<SimpleResult> {
  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.category.update({ where: { id }, data: { sortOrder: index * 10 } })
    )
  );
  revalidateCategoryRoutes();
  return { ok: true };
}

export async function setCategoryArchived(input: {
  id: string;
  archived: boolean;
}): Promise<SimpleResult> {
  const existing = await prisma.category.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!existing) return { ok: false, error: "That category no longer exists." };

  await prisma.category.update({ where: { id: input.id }, data: { isArchived: input.archived } });
  revalidateCategoryRoutes();
  return { ok: true };
}

export async function deleteCategory(input: { id: string }): Promise<SimpleResult> {
  const usage = await prisma.category.findUnique({
    where: { id: input.id },
    select: { _count: { select: { expenses: true } } },
  });
  if (!usage) return { ok: false, error: "That category no longer exists." };
  if (usage._count.expenses > 0) {
    return { ok: false, error: "This category has expenses — archive it instead of deleting it." };
  }

  await prisma.category.delete({ where: { id: input.id } });
  revalidateCategoryRoutes();
  return { ok: true };
}
