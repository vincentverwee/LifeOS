"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { PeriodType } from "@/lib/data/periods";

export type CreateCategoryInput = {
  name: string;
  periodType: PeriodType;
  periodId: string;
};

export type CreateCategoryResult =
  | { ok: true; category: { id: string; name: string } }
  | { ok: false; error: string };

export async function createCategory(input: CreateCategoryInput): Promise<CreateCategoryResult> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Category name can't be empty." };
  }

  const periodWhere =
    input.periodType === "trip" ? { tripId: input.periodId } : { cycleId: input.periodId };

  const existing = await prisma.category.findFirst({
    where: { ...periodWhere, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: `"${name}" already exists for this period.` };
  }

  const category = await prisma.category.create({
    data: {
      name,
      // Exactly one of tripId/cycleId — the app-layer half of the invariant
      // the schema itself can't express with this project's db-push workflow.
      tripId: input.periodType === "trip" ? input.periodId : undefined,
      cycleId: input.periodType === "cycle" ? input.periodId : undefined,
    },
    select: { id: true, name: true },
  });

  revalidatePath("/expenses");

  return { ok: true, category };
}
