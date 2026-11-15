import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { parseHicp, type BudgetMonth, type CpiPoint } from "@/lib/invest/inflation";

// Belgium's HICP from Eurostat (all items, 2015 = 100). Only fetched here, by the push
// cron, at most once a day; pages read the stored months.
const HICP_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?geo=BE&coicop18=TOTAL&unit=I15&sinceTimePeriod=2015-01";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

/** Called by /api/push/cron: fetches the index when the stored months are over a day old. */
export async function refreshInflationIfStale(): Promise<{ skipped: true } | { months: number; latest: string | null }> {
  const newest = await prisma.cpiMonth.findFirst({ orderBy: { fetchedAt: "desc" }, select: { fetchedAt: true } });
  if (newest && Date.now() - newest.fetchedAt.getTime() < MAX_AGE_MS) return { skipped: true };

  const res = await fetch(HICP_URL, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Eurostat HTTP ${res.status}`);
  const points = parseHicp(await res.json());
  if (!points || points.length === 0) throw new Error("Eurostat had no index");

  const now = new Date();
  // Replace everything: Eurostat revises recent months now and then.
  await prisma.$transaction([
    prisma.cpiMonth.deleteMany({}),
    prisma.cpiMonth.createMany({ data: points.map((p) => ({ month: utc(`${p.month}-01`), index: p.index, fetchedAt: now })) }),
  ]);
  return { months: points.length, latest: points.at(-1)?.month ?? null };
}

async function loadCpi(): Promise<CpiPoint[]> {
  const rows = await prisma.cpiMonth.findMany({ orderBy: { month: "asc" }, select: { month: true, index: true } });
  return rows.map((r) => ({ month: dayKey(r.month).slice(0, 7), index: Number(r.index) }));
}

export const getCpi = cache(loadCpi);

export type SavingsBalanceRow = { id: string; date: string; balance: number };
export type SavingsAccountView = {
  id: string;
  name: string;
  ratePct: number | null;
  color: string;
  isArchived: boolean;
  /** Newest first. */
  balances: SavingsBalanceRow[];
};

export async function getSavingsAccounts(): Promise<SavingsAccountView[]> {
  const rows = await prisma.savingsAccount.findMany({
    orderBy: [{ isArchived: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: { balances: { orderBy: { date: "desc" } } },
  });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    ratePct: a.ratePct === null ? null : Number(a.ratePct),
    color: a.color,
    isArchived: a.isArchived,
    balances: a.balances.map((b) => ({ id: b.id, date: dayKey(b.date), balance: Number(b.balance) })),
  }));
}

/**
 * Budget months for "budget vs inflation": every month that has ended (trips left
 * out), with its budget and what was spent, plus the month covering today.
 */
export async function getBudgetMonths(todayKey: string): Promise<{ months: BudgetMonth[]; current: { budget: number; label: string | null } | null }> {
  const [cycles, sums] = await Promise.all([
    prisma.budgetCycle.findMany({ select: { id: true, startDate: true, endDate: true, startingBudget: true, label: true }, orderBy: { startDate: "asc" } }),
    prisma.expense.groupBy({ by: ["cycleId"], where: { cycleId: { not: null } }, _sum: { amount: true } }),
  ]);
  const spent = new Map(sums.map((s) => [s.cycleId, Number(s._sum.amount ?? 0)]));
  const today = utc(todayKey);
  const months: BudgetMonth[] = [];
  let current: { budget: number; label: string | null } | null = null;
  for (const c of cycles) {
    if (c.startDate <= today && c.endDate >= today) current = { budget: Number(c.startingBudget), label: c.label };
    if (c.endDate < today) months.push({ start: dayKey(c.startDate), label: c.label, budget: Number(c.startingBudget), spent: spent.get(c.id) ?? 0 });
  }
  return { months, current };
}
