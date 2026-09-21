"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CreateExpenseInput = {
  categoryId: string;
  amount: number;
  date?: string;
  note?: string | null;
  tagIds: string[];
};

export type CreateExpenseResult =
  | { ok: true; expenseId: string }
  | { ok: false; error: string };

export async function createExpense(input: CreateExpenseInput): Promise<CreateExpenseResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, tripId: true, cycleId: true },
  });
  if (!category) {
    return { ok: false, error: "That category no longer exists." };
  }

  const amount = Math.round(input.amount * 100) / 100;
  const date = input.date ? new Date(input.date) : new Date();

  const expense = await prisma.expense.create({
    data: {
      categoryId: category.id,
      // Derived from the category — never trust a client-supplied period id,
      // so an expense's period can never disagree with its category's period.
      tripId: category.tripId,
      cycleId: category.cycleId,
      amount,
      date,
      note: input.note?.trim() || null,
      tags: input.tagIds.length ? { connect: input.tagIds.map((id) => ({ id })) } : undefined,
    },
    select: { id: true },
  });

  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/insights");

  return { ok: true, expenseId: expense.id };
}

export type CreateExpenseFormState = CreateExpenseResult | null;

export async function createExpenseFromForm(
  _prevState: CreateExpenseFormState,
  formData: FormData
): Promise<CreateExpenseFormState> {
  const categoryId = String(formData.get("categoryId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const note = formData.get("note");
  const tagIds = formData.getAll("tagIds").map(String);

  if (!categoryId) {
    return { ok: false, error: "Pick a category first." };
  }

  const amount = Number.parseFloat(amountRaw.replace(",", "."));

  return createExpense({
    categoryId,
    amount,
    note: typeof note === "string" ? note : null,
    tagIds,
  });
}
