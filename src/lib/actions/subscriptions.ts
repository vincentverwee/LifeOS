"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MAX_AMOUNT, dayKey, formatDate, parseAmount, parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { monthFor } from "@/lib/data/ensureMonth";
import { knownError } from "@/lib/prismaErrors";
import { anchorsFrom, isSubscriptionRepeat, renewalAfter, renewalOnOrAfter } from "@/lib/subscriptions/schedule";

export type SubscriptionResult = { ok: true } | { ok: false; error: string };

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function scheduleOf(row: { repeat: string; anchorDay: number; anchorMonth: number | null }) {
  return { repeat: row.repeat === "yearly" ? ("yearly" as const) : ("monthly" as const), anchorDay: row.anchorDay, anchorMonth: row.anchorMonth };
}

function revalidate() {
  revalidatePath("/"); // hub tile shows renewals to confirm
  revalidatePath("/budget");
  revalidatePath("/budget/subscriptions", "layout");
}

function revalidateWithExpenses() {
  revalidate();
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget/insights");
  revalidatePath("/budget/settings");
}

export type SubscriptionInput = {
  name: string;
  /** As typed: "10,99", calculations allowed (parseAmount). */
  amount: string;
  categoryId: string;
  repeat: string;
  /** The next charge; the schedule's day (and month, yearly) come from it. */
  nextDueOn: string;
  note: string;
};

async function readInput(input: SubscriptionInput) {
  const name = String(input.name ?? "").trim();
  if (!name) return "Give it a name.";
  if (name.length > 40) return "Keep the name short (40 characters at most).";
  const amount = parseAmount(String(input.amount ?? ""));
  if (amount === null || amount <= 0) return "Enter the price.";
  if (amount > MAX_AMOUNT) return "That amount is too large.";
  if (!isSubscriptionRepeat(input.repeat)) return "Pick monthly or yearly.";
  const nextDueOn = parseDateKey(input.nextDueOn);
  if (!nextDueOn) return "Pick the date of the next charge.";
  const category = await prisma.category.findUnique({ where: { id: String(input.categoryId) }, select: { id: true, isArchived: true } });
  if (!category || category.isArchived) return "Pick a category.";
  return {
    name,
    amount: Math.round(amount * 100) / 100,
    categoryId: category.id,
    repeat: input.repeat,
    ...anchorsFrom(nextDueOn, input.repeat),
    nextDueOn: utc(nextDueOn),
    note: String(input.note ?? "").trim().slice(0, 200) || null,
  };
}

export async function createSubscription(input: SubscriptionInput): Promise<SubscriptionResult> {
  await requireAuth();
  const data = await readInput(input);
  if (typeof data === "string") return { ok: false, error: data };
  try {
    await prisma.subscription.create({ data });
  } catch (e) {
    return knownError(e, { P2002: `${data.name} already exists.`, P2003: "That category no longer exists." });
  }
  revalidate();
  return { ok: true };
}

export async function updateSubscription(id: string, input: SubscriptionInput): Promise<SubscriptionResult> {
  await requireAuth();
  const data = await readInput(input);
  if (typeof data === "string") return { ok: false, error: data };
  try {
    await prisma.subscription.update({ where: { id }, data });
  } catch (e) {
    return knownError(e, {
      P2002: `${data.name} already exists.`,
      P2003: "That category no longer exists.",
      P2025: "This subscription no longer exists.",
    });
  }
  revalidate();
  return { ok: true };
}

/** Stops or resumes one. Resuming skips the renewals that passed while it was stopped. */
export async function setSubscriptionActive(id: string, active: boolean): Promise<SubscriptionResult> {
  await requireAuth();
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return { ok: false, error: "This subscription no longer exists." };
  const nextDueOn = active ? utc(renewalOnOrAfter(scheduleOf(sub), dayKey(sub.nextDueOn), await getTodayKey())) : sub.nextDueOn;
  await prisma.subscription.update({ where: { id }, data: { isActive: active, nextDueOn } });
  revalidate();
  return { ok: true };
}

/** Deletes it; the expenses it logged stay (no longer linked). */
export async function deleteSubscription(id: string): Promise<SubscriptionResult> {
  await requireAuth();
  await prisma.subscription.deleteMany({ where: { id } });
  revalidate();
  redirect("/budget/subscriptions");
}

/**
 * Moves a due subscription on to its next renewal. `expectedDueOn` is the renewal
 * the screen showed: when it has moved already (double tap, another device), nothing
 * happens. With `log`, the charge becomes an expense dated on that renewal day, in
 * the month that covers it; another amount than the stored price becomes the new price.
 */
async function advance(id: string, expectedDueOn: string, log: { amount: number } | null): Promise<SubscriptionResult> {
  const dueKey = parseDateKey(expectedDueOn);
  if (!dueKey) return { ok: false, error: "That renewal date isn't valid." };
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return { ok: false, error: "This subscription no longer exists." };
  if (!sub.isActive || dayKey(sub.nextDueOn) !== dueKey) return { ok: false, error: "Already done." };

  const next = renewalAfter(scheduleOf(sub), dueKey);
  const month = log ? await monthFor(dueKey, await getTodayKey()) : null;
  if (log && !month) return { ok: false, error: `No month covers ${formatDate(dueKey)}.` };

  const done = await prisma.$transaction(async (tx) => {
    const { count } = await tx.subscription.updateMany({
      where: { id, isActive: true, nextDueOn: utc(dueKey) },
      data: { nextDueOn: utc(next), ...(log && { amount: log.amount }) },
    });
    if (count === 0) return false;
    if (log && month) {
      await tx.expense.create({
        data: {
          categoryId: sub.categoryId,
          cycleId: month.id,
          date: utc(dueKey),
          amount: log.amount,
          note: sub.name,
          subscriptionId: sub.id,
        },
      });
    }
    return true;
  });
  if (!done) return { ok: false, error: "Already done." };

  if (log) revalidateWithExpenses();
  else revalidate();
  return { ok: true };
}

/** Logs a due renewal as an expense (the stored price, or `amount` as typed). */
export async function logSubscription(id: string, expectedDueOn: string, amount?: string): Promise<SubscriptionResult> {
  await requireAuth();
  let value: number;
  if (amount === undefined) {
    const sub = await prisma.subscription.findUnique({ where: { id }, select: { amount: true } });
    if (!sub) return { ok: false, error: "This subscription no longer exists." };
    value = sub.amount.toNumber();
  } else {
    const parsed = parseAmount(String(amount));
    if (parsed === null || parsed <= 0) return { ok: false, error: "Enter the amount that was charged." };
    if (parsed > MAX_AMOUNT) return { ok: false, error: "That amount is too large." };
    value = Math.round(parsed * 100) / 100;
  }
  return advance(id, expectedDueOn, { amount: value });
}

/** Skips a due renewal (not charged this time) without logging anything. */
export async function skipSubscription(id: string, expectedDueOn: string): Promise<SubscriptionResult> {
  await requireAuth();
  return advance(id, expectedDueOn, null);
}
