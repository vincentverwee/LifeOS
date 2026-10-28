import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { dayKey } from "@/lib/format";
import { isCategoryColorSlot, type CategoryColorSlot } from "@/lib/categoryPalette";
import { isSubscriptionRepeat, type Subscription } from "@/lib/subscriptions/schedule";

export type SubscriptionRow = Subscription & { category: { name: string; color: CategoryColorSlot } };

const include = { category: { select: { name: true, color: true } } } as const;

type Row = Prisma.SubscriptionGetPayload<{ include: typeof include }>;

function toRow(row: Row): SubscriptionRow {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount.toNumber(),
    categoryId: row.categoryId,
    repeat: isSubscriptionRepeat(row.repeat) ? row.repeat : "monthly",
    anchorDay: row.anchorDay,
    anchorMonth: row.anchorMonth,
    nextDueOn: dayKey(row.nextDueOn),
    isActive: row.isActive,
    note: row.note,
    category: { name: row.category.name, color: isCategoryColorSlot(row.category.color) ? row.category.color : "blue" },
  };
}

/** Every subscription: active ones by next renewal, then stopped ones by name. */
export async function getSubscriptions(): Promise<SubscriptionRow[]> {
  const rows = await prisma.subscription.findMany({
    include,
    orderBy: [{ isActive: "desc" }, { nextDueOn: "asc" }, { name: "asc" }],
  });
  return rows.map(toRow);
}

/** Active subscriptions whose renewal is today or earlier and not yet logged or skipped. */
export async function getDueSubscriptions(todayKey: string): Promise<SubscriptionRow[]> {
  const rows = await prisma.subscription.findMany({
    where: { isActive: true, nextDueOn: { lte: new Date(`${todayKey}T00:00:00Z`) } },
    include,
    orderBy: [{ nextDueOn: "asc" }, { name: "asc" }],
  });
  return rows.map(toRow);
}

export type SubscriptionCharge = { id: string; date: string; amount: number };

/** One subscription with what it charged (its logged expenses, latest first). */
export async function getSubscription(id: string): Promise<{ subscription: SubscriptionRow; charges: SubscriptionCharge[] } | null> {
  const row = await prisma.subscription.findUnique({
    where: { id },
    include: { ...include, expenses: { select: { id: true, date: true, amount: true }, orderBy: { date: "desc" } } },
  });
  if (!row) return null;
  return {
    subscription: toRow(row),
    charges: row.expenses.map((e) => ({ id: e.id, date: dayKey(e.date), amount: e.amount.toNumber() })),
  };
}
