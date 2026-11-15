"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { knownError } from "@/lib/prismaErrors";
import { parseAmount, parseDateKey, MAX_AMOUNT } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { CATEGORY_COLOR_SLOTS } from "@/lib/categoryPalette";
import type { FormState, Result } from "@/lib/actions/invest";

const utc = (key: string) => new Date(`${key}T00:00:00Z`);
const clean = (raw: unknown) => String(raw ?? "").replace(/\s+/g, " ").trim();

function revalidate() {
  revalidatePath("/");
  revalidatePath("/invest", "layout");
}

/** "2,5" → 2.5; empty = no rate; undefined = invalid. */
function rate(raw: unknown): number | null | undefined {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 20 ? Math.round(n * 100) / 100 : undefined;
}

/** Adds an account, or renames / re-rates one (`id` set). */
export async function saveSavingsAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const id = clean(formData.get("id")) || null;
  const name = clean(formData.get("name"));
  if (!name) return { ok: false, error: "Give the account a name." };
  if (name.length > 60) return { ok: false, error: "Keep the name to 60 characters." };
  const ratePct = rate(formData.get("ratePct"));
  if (ratePct === undefined) return { ok: false, error: "The interest is a percentage from 0 to 20 (e.g. 2,5)." };
  try {
    if (id) {
      await prisma.savingsAccount.update({ where: { id }, data: { name, ratePct } });
    } else {
      const used = await prisma.savingsAccount.findMany({ select: { color: true, sortOrder: true } });
      const color = CATEGORY_COLOR_SLOTS.find((c) => !used.some((u) => u.color === c)) ?? CATEGORY_COLOR_SLOTS[used.length % CATEGORY_COLOR_SLOTS.length];
      const sortOrder = used.reduce((m, u) => Math.max(m, u.sortOrder + 1), 0);
      await prisma.savingsAccount.create({ data: { name, ratePct, color, sortOrder } });
    }
  } catch (e) {
    return knownError(e, { P2002: "You already have an account with that name.", P2025: "That account was deleted in the meantime." });
  }
  revalidate();
  return { ok: true, at: Date.now() };
}

export async function setSavingsAccountArchived(id: string, archived: boolean): Promise<Result> {
  await requireAuth();
  await prisma.savingsAccount.updateMany({ where: { id }, data: { isArchived: archived } });
  revalidate();
  return { ok: true };
}

/** Deletes the account and its balance history. */
export async function deleteSavingsAccount(id: string): Promise<Result> {
  await requireAuth();
  await prisma.savingsAccount.deleteMany({ where: { id } });
  revalidate();
  return { ok: true };
}

/** One balance per account per day: saving the same day again replaces it. */
export async function saveSavingsBalance(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const accountId = clean(formData.get("accountId"));
  const date = parseDateKey(formData.get("date"));
  if (!date) return { ok: false, error: "Pick a date." };
  if (date > (await getTodayKey())) return { ok: false, error: "That date is in the future." };
  const balance = parseAmount(String(formData.get("balance") ?? ""));
  if (balance === null || balance < 0 || balance > MAX_AMOUNT) return { ok: false, error: "Fill in the balance." };
  const amount = Math.round(balance * 100) / 100;
  try {
    await prisma.savingsBalance.upsert({
      where: { accountId_date: { accountId, date: utc(date) } },
      create: { accountId, date: utc(date), balance: amount },
      update: { balance: amount },
    });
  } catch (e) {
    return knownError(e, { P2003: "That account was deleted in the meantime." });
  }
  revalidate();
  return { ok: true, at: Date.now() };
}

export async function deleteSavingsBalance(id: string): Promise<Result> {
  await requireAuth();
  await prisma.savingsBalance.deleteMany({ where: { id } });
  revalidate();
  return { ok: true };
}
