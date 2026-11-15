// Pure inflation math: Belgium's HICP (one index per month, "YYYY-MM"), money in
// today's euros, what deposits would need to be worth to keep up, real rates.
import { cashIn, sortTrades, type SeriesPoint } from "./stats";
import type { Trade } from "./types";

export type CpiPoint = { month: string; index: number };

export const monthOf = (key: string) => key.slice(0, 7);

/**
 * Eurostat's JSON-stat reply → points, oldest first. `value` is keyed by the flat
 * position over all dimensions; with every dimension but time fixed to one value,
 * the time position is (key ÷ time's stride) mod time's size.
 */
export function parseHicp(json: unknown): CpiPoint[] | null {
  const d = json as {
    id?: string[];
    size?: number[];
    value?: Record<string, number | null>;
    dimension?: { time?: { category?: { index?: Record<string, number> } } };
  };
  const ids = d?.id;
  const sizes = d?.size;
  const timeIndex = d?.dimension?.time?.category?.index;
  if (!ids || !sizes || !timeIndex || !d.value) return null;
  const t = ids.indexOf("time");
  if (t < 0) return null;
  const stride = sizes.slice(t + 1).reduce((a, b) => a * b, 1);
  const byPos = new Map(Object.entries(timeIndex).map(([month, pos]) => [pos, month]));
  const out: CpiPoint[] = [];
  for (const [key, value] of Object.entries(d.value)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    const month = byPos.get(Math.floor(Number(key) / stride) % sizes[t]);
    if (month && /^\d{4}-\d{2}$/.test(month)) out.push({ month, index: value });
  }
  return out.sort((a, b) => (a.month < b.month ? -1 : 1));
}

/** The index for a month: that month's, else the newest before it (carried forward), else the oldest. */
export function indexFor(cpi: CpiPoint[], month: string): number | null {
  if (cpi.length === 0) return null;
  let lo = 0;
  let hi = cpi.length - 1;
  let found = cpi[0].index;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cpi[mid].month <= month) {
      found = cpi[mid].index;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/** How much prices moved from one month to another (1.05 = 5 % dearer); 1 without data. */
export function factor(cpi: CpiPoint[], from: string, to: string): number {
  const a = indexFor(cpi, from);
  const b = indexFor(cpi, to);
  return a && b ? b / a : 1;
}

/** An amount from `from` in the prices of `to` (default: the newest known month). */
export function inTodaysEuros(amount: number, from: string, cpi: CpiPoint[], to?: string): number {
  return amount * factor(cpi, from, to ?? cpi.at(-1)?.month ?? from);
}

/** Year-on-year inflation per month (0.029 = 2.9 %), only months with one exactly a year earlier. */
export function yearOnYear(cpi: CpiPoint[]): { month: string; pct: number }[] {
  const byMonth = new Map(cpi.map((p) => [p.month, p.index]));
  const out: { month: string; pct: number }[] = [];
  for (const p of cpi) {
    const [y, m] = p.month.split("-");
    const before = byMonth.get(`${Number(y) - 1}-${m}`);
    if (before) out.push({ month: p.month, pct: p.index / before - 1 });
  }
  return out;
}

export type KeepUpPoint = SeriesPoint & { /** Every net deposit grown with prices up to this day. */ keepUp: number };

/**
 * Adds "needed to keep up" to a value series: each deposit (`cashIn`: buys in, sells
 * and dividends out) × index(point's month) ÷ index(deposit's month).
 */
export function keepUpSeries(trades: Trade[], cpi: CpiPoint[], series: SeriesPoint[]): KeepUpPoint[] {
  const sorted = sortTrades(trades);
  let i = 0;
  let scaled = 0; // Σ cashIn ÷ index at the deposit
  return series.map((p) => {
    while (i < sorted.length && sorted[i].date <= p.date) {
      const t = sorted[i++];
      scaled += cashIn(t) / (indexFor(cpi, monthOf(t.date)) ?? 1);
    }
    const idx = indexFor(cpi, monthOf(p.date));
    return { ...p, keepUp: idx ? scaled * idx : p.deposited };
  });
}

/** The portfolio now vs every deposit grown with inflation to the newest known month. */
export function realResult(trades: Trade[], cpi: CpiPoint[], value: number): { keepUp: number; realGain: number; realPct: number | null } {
  const latest = cpi.at(-1)?.month;
  const keepUp = trades.reduce((s, t) => s + (latest ? inTodaysEuros(cashIn(t), monthOf(t.date), cpi, latest) : cashIn(t)), 0);
  const realGain = value - keepUp;
  return { keepUp, realGain, realPct: keepUp > 0 ? realGain / keepUp : null };
}

/** Interest after inflation: (1 + rate) ÷ (1 + inflation) − 1, both as shares (0.025). */
export function realRate(rate: number, inflation: number): number {
  return (1 + rate) / (1 + inflation) - 1;
}

export type BudgetMonth = { start: string; label: string | null; budget: number; spent: number };
export type BudgetRow = BudgetMonth & { budgetToday: number; spentToday: number };

/**
 * Budget months in today's euros (newest first), and how the current budget
 * compares with the first month carrying the same label, grown with prices.
 */
export function budgetVsInflation(
  months: BudgetMonth[],
  cpi: CpiPoint[],
  current: { budget: number; label: string | null } | null,
): { rows: BudgetRow[]; first: (BudgetRow & { keepUp: number }) | null } {
  const rows = [...months]
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .map((m) => ({
      ...m,
      budgetToday: inTodaysEuros(m.budget, monthOf(m.start), cpi),
      spentToday: inTodaysEuros(m.spent, monthOf(m.start), cpi),
    }));
  const same = current ? rows.filter((r) => r.label === current.label && r.budget > 0) : [];
  const oldest = same.at(-1);
  return { rows, first: oldest ? { ...oldest, keepUp: oldest.budgetToday } : null };
}
