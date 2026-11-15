// Pure portfolio math: positions (average-cost method), totals, allocation, value
// over time, money put in per month and realised gains. Dates are "YYYY-MM-DD".
import type { Fund, PricePoint, Trade } from "./types";

const EPS = 1e-9;

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const TYPE_ORDER = { buy: 0, dividend: 1, sell: 2 } as const;

/** Oldest first; on one day buys come before sells, so buying and selling the same day works. */
export function sortTrades<T extends Pick<Trade, "date" | "type">>(trades: T[]): T[] {
  return [...trades].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : TYPE_ORDER[a.type] - TYPE_ORDER[b.type]));
}

/** Money a trade moves from your pocket into the portfolio (negative = money back out). */
export function cashIn(t: Trade): number {
  if (t.type === "buy") return (t.units ?? 0) * (t.price ?? 0) + t.fees + t.tax;
  if (t.type === "sell") return -((t.units ?? 0) * (t.price ?? 0) - t.fees - t.tax);
  return -((t.amount ?? 0) - t.tax);
}

type Book = { units: number; cost: number; realised: number; dividends: number };

function emptyBook(): Book {
  return { units: 0, cost: 0, realised: 0, dividends: 0 };
}

/** Applies one trade to a fund's book; returns the realised gain of a sell (0 otherwise). */
function apply(book: Book, t: Trade): number {
  if (t.type === "buy") {
    book.units += t.units ?? 0;
    book.cost += cashIn(t);
    return 0;
  }
  if (t.type === "dividend") {
    book.dividends += (t.amount ?? 0) - t.tax;
    return 0;
  }
  const units = t.units ?? 0;
  const avg = book.units > EPS ? book.cost / book.units : 0;
  const gain = units * (t.price ?? 0) - t.fees - t.tax - avg * units;
  book.cost -= avg * units;
  book.units -= units;
  if (book.units < EPS) {
    book.units = 0;
    book.cost = 0;
  }
  book.realised += gain;
  return gain;
}

/** Every fund's book after all trades. */
export function books(trades: Trade[]): Map<string, Book> {
  const out = new Map<string, Book>();
  for (const t of sortTrades(trades)) {
    const book = out.get(t.instrumentId) ?? emptyBook();
    apply(book, t);
    out.set(t.instrumentId, book);
  }
  return out;
}

/** The first trade that sells more than was held at that point, or null when none does. */
export function firstOversell(trades: Trade[]): Trade | null {
  const held = new Map<string, number>();
  for (const t of sortTrades(trades)) {
    if (t.type === "dividend") continue;
    const units = (held.get(t.instrumentId) ?? 0) + (t.type === "buy" ? 1 : -1) * (t.units ?? 0);
    if (units < -1e-6) return t;
    held.set(t.instrumentId, units);
  }
  return null;
}

/** The newest price on or before `key` (prices oldest first), or null. */
export function closeOn(prices: PricePoint[], key: string): PricePoint | null {
  let lo = 0;
  let hi = prices.length - 1;
  let found: PricePoint | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (prices[mid].date <= key) {
      found = prices[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

export type Position = {
  fund: Fund;
  units: number;
  /** What the units held cost, fees and tax included (average cost). */
  cost: number;
  /** Units × the latest price (the last trade's price when no price is stored yet). */
  value: number;
  price: number | null;
  /** Date of `price`; null = taken from a trade, not a fetched close. */
  priceDate: string | null;
  gain: number;
  /** gain ÷ cost; null with nothing held. */
  gainPct: number | null;
  realised: number;
  dividends: number;
  /** Units × (latest close − the close before it). */
  dayChange: number;
};

/** One position per fund that has trades, biggest first. */
export function positions(funds: Fund[], trades: Trade[], pricesById: Record<string, PricePoint[]>): Position[] {
  const byFund = books(trades);
  const lastTradePrice = new Map<string, number>();
  for (const t of sortTrades(trades)) if (t.price !== null) lastTradePrice.set(t.instrumentId, t.price);

  const out: Position[] = [];
  for (const fund of funds) {
    const book = byFund.get(fund.id);
    if (!book) continue;
    const prices = pricesById[fund.id] ?? [];
    const last = prices.at(-1) ?? null;
    const prev = prices.at(-2) ?? null;
    const price = last?.close ?? lastTradePrice.get(fund.id) ?? null;
    const value = price !== null ? book.units * price : book.cost;
    const gain = value - book.cost;
    out.push({
      fund,
      units: book.units,
      cost: book.cost,
      value,
      price,
      priceDate: last?.date ?? null,
      gain,
      gainPct: book.cost > EPS ? gain / book.cost : null,
      realised: book.realised,
      dividends: book.dividends,
      dayChange: last && prev ? book.units * (last.close - prev.close) : 0,
    });
  }
  return out.sort((a, b) => b.value - a.value);
}

export type Totals = {
  value: number;
  cost: number;
  gain: number;
  gainPct: number | null;
  realised: number;
  dividends: number;
  dayChange: number;
  /** Money put in minus money taken out (buys − sells − dividends). */
  netDeposited: number;
};

export function totals(list: Position[], trades: Trade[]): Totals {
  const sum = (f: (p: Position) => number) => list.reduce((s, p) => s + f(p), 0);
  const cost = sum((p) => p.cost);
  const gain = sum((p) => p.gain);
  return {
    value: sum((p) => p.value),
    cost,
    gain,
    gainPct: cost > EPS ? gain / cost : null,
    realised: sum((p) => p.realised),
    dividends: sum((p) => p.dividends),
    dayChange: sum((p) => p.dayChange),
    netDeposited: trades.reduce((s, t) => s + cashIn(t), 0),
  };
}

export type Slice = { fund: Fund; value: number; share: number; target: number | null; /** share − target, in points. */ diff: number | null };

/** How the value is split over the funds still held, vs each fund's target %. */
export function allocation(list: Position[]): Slice[] {
  const held = list.filter((p) => p.units > EPS);
  const total = held.reduce((s, p) => s + p.value, 0);
  return held.map((p) => {
    const share = total > 0 ? (p.value / total) * 100 : 0;
    const target = p.fund.targetPct;
    return { fund: p.fund, value: p.value, share, target, diff: target === null ? null : share - target };
  });
}

export type SeriesPoint = { date: string; value: number; /** Net money put in up to that day. */ deposited: number };

/**
 * The portfolio's value each day from the first trade (or `from`) to `to`: units held
 * that day × the newest close on or before it (a fund without one yet counts at the
 * last trade's price). Thinned to at most `maxPoints`, always keeping the last day.
 */
export function valueSeries(
  trades: Trade[],
  pricesById: Record<string, PricePoint[]>,
  to: string,
  options: { from?: string; maxPoints?: number } = {},
): SeriesPoint[] {
  const sorted = sortTrades(trades);
  if (sorted.length === 0) return [];
  const start = options.from && options.from > sorted[0].date ? options.from : sorted[0].date;
  const units = new Map<string, number>();
  const tradePrice = new Map<string, number>();
  let deposited = 0;
  let i = 0;
  const days: SeriesPoint[] = [];
  for (let day = sorted[0].date; day <= to; day = addDays(day, 1)) {
    while (i < sorted.length && sorted[i].date <= day) {
      const t = sorted[i++];
      deposited += cashIn(t);
      if (t.type !== "dividend") {
        units.set(t.instrumentId, (units.get(t.instrumentId) ?? 0) + (t.type === "buy" ? 1 : -1) * (t.units ?? 0));
        if (t.price !== null) tradePrice.set(t.instrumentId, t.price);
      }
    }
    if (day < start) continue;
    let value = 0;
    for (const [id, u] of units) {
      if (u < EPS) continue;
      const close = closeOn(pricesById[id] ?? [], day)?.close ?? tradePrice.get(id) ?? 0;
      value += u * close;
    }
    days.push({ date: day, value, deposited });
  }
  const max = options.maxPoints ?? 400;
  if (days.length <= max) return days;
  const step = Math.ceil(days.length / max);
  const thinned = days.filter((_, k) => k % step === 0);
  if (thinned.at(-1) !== days.at(-1)) thinned.push(days.at(-1)!);
  return thinned;
}

/** Growth between two points, leaving out money put in or taken out in between. */
export function growthBetween(a: SeriesPoint, b: SeriesPoint): number {
  return b.value - b.deposited - (a.value - a.deposited);
}

/** Net money put in per month ("YYYY-MM", oldest first), only months with trades. */
export function depositsByMonth(trades: Trade[]): { month: string; net: number }[] {
  const by = new Map<string, number>();
  for (const t of sortTrades(trades)) {
    if (t.type === "dividend") continue;
    const m = t.date.slice(0, 7);
    by.set(m, (by.get(m) ?? 0) + cashIn(t));
  }
  return [...by].map(([month, net]) => ({ month, net }));
}

/** Gains realised by sells in one calendar year (average cost) and net dividends received in it. */
export function yearResult(trades: Trade[], year: number): { realised: number; dividends: number } {
  const prefix = String(year);
  const byFund = new Map<string, Book>();
  let realised = 0;
  let dividends = 0;
  for (const t of sortTrades(trades)) {
    const book = byFund.get(t.instrumentId) ?? emptyBook();
    const gain = apply(book, t);
    byFund.set(t.instrumentId, book);
    if (!t.date.startsWith(prefix)) continue;
    if (t.type === "sell") realised += gain;
    if (t.type === "dividend") dividends += (t.amount ?? 0) - t.tax;
  }
  return { realised, dividends };
}

/** Suggested tax for a buy/sell: the fund's TOB rate × the trade amount, rounded to cents. */
export function suggestedTob(units: number, price: number, rate: number): number {
  return Math.round(units * price * rate * 100) / 100;
}
