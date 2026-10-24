// Pure comparison math for the Insights page: how a period is doing against
// the average of its peers (other finished periods with the same label).
// Periods differ in length (calendar months, 18th→17th cycles, trips), so
// everything is compared by *day of the period*, not by calendar date.
import { cumulativeAtDay, type Month, type MonthStats } from "@/lib/monthStats";

export type PeriodEntry = { month: Month; stats: MonthStats };

const MS_PER_DAY = 86_400_000;

function dayIndex(month: Month, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${month.startDate}T00:00:00Z`)) / MS_PER_DAY) + 1;
}

/** The day of the period we're comparing at: today for a running period, the last day otherwise. */
export function comparisonDay(entry: PeriodEntry): number {
  return Math.max(1, entry.stats.daysElapsed || entry.stats.daysInMonth);
}

export function isFinished(entry: PeriodEntry, todayKey: string): boolean {
  return entry.month.endDate < todayKey;
}

/** Spend per category up to and including `day` of the period. */
export function categoryTotalsAtDay(month: Month, day: number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of month.expenses) {
    if (dayIndex(month, e.date) > day) continue;
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
  }
  return totals;
}

const mean = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

export type Baseline = {
  label: string;
  peerCount: number;
  /** average cumulative spend at day N (index N-1), up to the longest peer */
  curve: number[];
  /** average of the peers' spend per day */
  avgPerDay: number;
  /** average full-period spend */
  avgTotal: number;
  /** average spend per category id at the comparison day */
  categoryAtDay: Map<string, number>;
  /** average cumulative spend at the comparison day */
  atDay: number;
};

export function labelBaseline(
  active: PeriodEntry,
  all: PeriodEntry[],
  todayKey: string
): Baseline | null {
  const label = active.month.label;
  if (!label) return null;
  const peers = all.filter(
    (e) => e.month.id !== active.month.id && e.month.label === label && isFinished(e, todayKey)
  );
  if (peers.length === 0) return null;

  const longest = Math.max(...peers.map((p) => p.stats.daysInMonth));
  const curve = Array.from({ length: longest }, (_, i) =>
    mean(peers.map((p) => cumulativeAtDay(p.stats, i + 1)))
  );

  const day = comparisonDay(active);
  const categoryAtDay = new Map<string, number>();
  const perPeer = peers.map((p) => categoryTotalsAtDay(p.month, day));
  const ids = new Set(perPeer.flatMap((m) => [...m.keys()]));
  for (const id of ids) {
    categoryAtDay.set(id, mean(perPeer.map((m) => m.get(id) ?? 0)));
  }

  return {
    label,
    peerCount: peers.length,
    curve,
    avgPerDay: mean(peers.map((p) => p.stats.spent / p.stats.daysInMonth)),
    avgTotal: mean(peers.map((p) => p.stats.spent)),
    categoryAtDay,
    atDay: mean(peers.map((p) => cumulativeAtDay(p.stats, day))),
  };
}

/** The month right before this one (any label), or null for the first. Trips are skipped. */
export function previousMonth(active: PeriodEntry, all: PeriodEntry[]): PeriodEntry | null {
  let best: PeriodEntry | null = null;
  for (const e of all) {
    if (e.month.kind !== "month" || e.month.id === active.month.id) continue;
    if (e.month.startDate >= active.month.startDate) continue;
    if (!best || e.month.startDate > best.month.startDate) best = e;
  }
  return best;
}

export type LabelSummary = {
  label: string;
  count: number;
  avgPerDay: number;
  avgTotal: number;
};

/** Per label: how many periods and the typical spend, newest label first. */
export function labelSummaries(all: PeriodEntry[]): LabelSummary[] {
  const groups = new Map<string, PeriodEntry[]>();
  for (const e of all) {
    const label = e.month.label ?? "Other";
    groups.set(label, [...(groups.get(label) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([label, entries]) => ({
      label,
      count: entries.length,
      avgPerDay: mean(entries.filter((e) => e.stats.daysElapsed > 0).map((e) => e.stats.avgPerDay)),
      avgTotal: mean(entries.map((e) => e.stats.spent)),
      newest: entries.reduce((max, e) => (e.month.startDate > max ? e.month.startDate : max), ""),
    }))
    .sort((a, b) => b.newest.localeCompare(a.newest))
    .map(({ label, count, avgPerDay, avgTotal }) => ({ label, count, avgPerDay, avgTotal }));
}
