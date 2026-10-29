import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import type { PubOption } from "@/lib/beer/types";
import { monthStarts, totals, type BeerVisit, type PubRow } from "@/lib/beer/stats";

const pubSelect = { id: true, name: true, latitude: true, longitude: true, osmId: true } as const;

const beer = { category: { pintPrice: { not: null } } } as const;

/** Beers (expenses in a category with a pint price), oldest first: all, one pub's, or from a day on. */
export async function getBeerVisits(filter: { pubId?: string; from?: string } = {}): Promise<BeerVisit[]> {
  const rows = await prisma.expense.findMany({
    where: {
      ...beer,
      ...(filter.pubId && { pubId: filter.pubId }),
      ...(filter.from && { date: { gte: new Date(`${filter.from}T00:00:00Z`) } }),
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      date: true,
      amount: true,
      pints: true,
      note: true,
      pubId: true,
      pub: { select: { name: true } },
      category: { select: { pintPrice: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    date: dayKey(r.date),
    amount: r.amount.toNumber(),
    counted: r.pints,
    pintPrice: r.category.pintPrice?.toNumber() ?? 0,
    pubId: r.pubId,
    pubName: r.pub?.name ?? null,
    note: r.note,
  }));
}

export async function getPubs(): Promise<PubRow[]> {
  return prisma.pub.findMany({ select: pubSelect, orderBy: { name: "asc" } });
}

export async function getPub(id: string): Promise<PubRow | null> {
  return prisma.pub.findUnique({ where: { id }, select: pubSelect });
}

/**
 * Your pubs for the pub picker: most recently visited first, with their latest counted
 * price. Two small queries instead of every beer ever (this page loads often, also
 * in the background for offline use).
 */
export async function getPubOptions(): Promise<PubOption[]> {
  const [pubs, lastVisits, latestCounted] = await Promise.all([
    getPubs(),
    prisma.expense.groupBy({ by: ["pubId"], where: { pubId: { not: null } }, _max: { date: true } }),
    // The newest counted beer per pub.
    prisma.$queryRaw<{ pubId: string; amount: { toNumber(): number }; pints: number }[]>`
      SELECT DISTINCT ON ("pubId") "pubId", "amount", "pints" FROM "Expense"
      WHERE "pubId" IS NOT NULL AND "pints" IS NOT NULL
      ORDER BY "pubId", "date" DESC, "createdAt" DESC`,
  ]);
  const lastVisit = new Map(lastVisits.map((g) => [g.pubId, g._max.date ? dayKey(g._max.date) : null]));
  const price = new Map(latestCounted.map((r) => [r.pubId, Number(r.amount) / r.pints]));
  return pubs
    .map((p) => ({ ...p, pricePerPint: price.get(p.id) ?? null, lastVisit: lastVisit.get(p.id) ?? null }))
    .sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? "") || a.name.localeCompare(b.name));
}

export type BeerGlance = { pints: number; lastPub: string | null; lastVisit: string | null };

/** The hub tile: pints this calendar month and the latest beer (with its pub, if any). */
export async function getBeerGlance(todayKey: string): Promise<BeerGlance> {
  const [month, last] = await Promise.all([
    getBeerVisits({ from: monthStarts(todayKey).thisMonth }),
    prisma.expense.findFirst({
      where: beer,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { date: true, pub: { select: { name: true } } },
    }),
  ]);
  // Only up to today: a beer back-dated into the future isn't "this month so far".
  const pints = totals(month.filter((v) => v.date <= todayKey)).pints;
  return { pints, lastPub: last?.pub?.name ?? null, lastVisit: last ? dayKey(last.date) : null };
}
