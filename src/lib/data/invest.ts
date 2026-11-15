import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { dayKey } from "@/lib/format";
import { addDays, positions, totals, valueSeries, growthBetween, type Position, type Totals } from "@/lib/invest/stats";
import { isTradeType, type Fund, type PricePoint, type Trade } from "@/lib/invest/types";

const utc = (key: string) => new Date(`${key}T00:00:00Z`);
const num = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));

type InstrumentRow = Prisma.InstrumentGetPayload<object>;
type TradeRow = Prisma.InvestmentTxGetPayload<object>;

export function toFund(r: InstrumentRow): Fund {
  return {
    id: r.id,
    ticker: r.ticker,
    isin: r.isin,
    name: r.name,
    currency: r.currency,
    color: r.color,
    targetPct: num(r.targetPct),
    tobRate: Number(r.tobRate),
    isArchived: r.isArchived,
    pricesFetchedAt: r.pricesFetchedAt?.toISOString() ?? null,
  };
}

export function toTrade(r: TradeRow): Trade {
  return {
    id: r.id,
    instrumentId: r.instrumentId,
    date: dayKey(r.date),
    type: isTradeType(r.type) ? r.type : "buy",
    units: num(r.units),
    price: num(r.price),
    amount: num(r.amount),
    fees: Number(r.fees),
    tax: Number(r.tax),
    note: r.note,
  };
}

const ORDER = [{ isArchived: "asc" as const }, { sortOrder: "asc" as const }, { createdAt: "asc" as const }];

export async function getFunds(): Promise<Fund[]> {
  return (await prisma.instrument.findMany({ orderBy: ORDER })).map(toFund);
}

export async function getTrades(): Promise<Trade[]> {
  const rows = await prisma.investmentTx.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  return rows.map(toTrade);
}

/** Closes per fund since `from` (all when null), oldest first. */
async function getPrices(from: string | null): Promise<Record<string, PricePoint[]>> {
  const rows = await prisma.instrumentPrice.findMany({
    where: from ? { date: { gte: utc(from) } } : undefined,
    select: { instrumentId: true, date: true, close: true },
    orderBy: { date: "asc" },
  });
  const out: Record<string, PricePoint[]> = {};
  for (const r of rows) (out[r.instrumentId] ??= []).push({ date: dayKey(r.date), close: Number(r.close) });
  return out;
}

export type Portfolio = {
  funds: Fund[];
  trades: Trade[];
  prices: Record<string, PricePoint[]>;
  positions: Position[];
  totals: Totals;
};

/** Everything, for the section's pages: prices from a week before the first trade. */
async function loadPortfolio(): Promise<Portfolio> {
  const [funds, trades] = await Promise.all([getFunds(), getTrades()]);
  const first = trades.at(-1)?.date ?? null;
  const prices = await getPrices(first ? addDays(first, -7) : null);
  const list = positions(funds, trades, prices);
  return { funds, trades, prices, positions: list, totals: totals(list, trades) };
}

export const getPortfolio = cache(loadPortfolio);

export type InvestGlance = {
  funds: number;
  value: number;
  gain: number;
  gainPct: number | null;
  dayChange: number;
  /** Growth this calendar month without new money; null before a trade. */
  monthGrowth: number | null;
  /** monthGrowth ÷ the value at the start of the month (or the money put in this month). */
  monthPct: number | null;
  slices: { color: string; value: number; ticker: string }[];
  /** The newest balance of every active savings account, added up; null without any. */
  savings: number | null;
};

/** Newest balance per active savings account, summed (one query, newest first). */
async function savingsTotal(): Promise<number | null> {
  const rows = await prisma.savingsBalance.findMany({
    where: { account: { isArchived: false } },
    orderBy: { date: "desc" },
    distinct: ["accountId"],
    select: { balance: true },
  });
  return rows.length ? rows.reduce((s, r) => s + Number(r.balance), 0) : null;
}

/** Home tile and mood: trades plus only the last ~40 days of prices. */
async function loadInvestGlance(todayKey: string): Promise<InvestGlance> {
  const [funds, trades, savings] = await Promise.all([getFunds(), getTrades(), savingsTotal()]);
  if (trades.length === 0) {
    return { funds: funds.filter((f) => !f.isArchived).length, value: 0, gain: 0, gainPct: null, dayChange: 0, monthGrowth: null, monthPct: null, slices: [], savings };
  }
  const monthStart = `${todayKey.slice(0, 7)}-01`;
  const prices = await getPrices(addDays(monthStart, -10));
  const list = positions(funds, trades, prices);
  const t = totals(list, trades);
  const series = valueSeries(trades, prices, todayKey, { from: addDays(monthStart, -1) });
  let monthGrowth: number | null = null;
  let monthPct: number | null = null;
  if (series.length > 0) {
    // First trade this month: count from nothing.
    const start = series[0].date < monthStart ? series[0] : { date: monthStart, value: 0, deposited: 0 };
    const end = series.at(-1)!;
    monthGrowth = growthBetween(start, end);
    const base = start.value > 0 ? start.value : end.deposited - start.deposited;
    monthPct = base > 0 ? monthGrowth / base : null;
  }
  return {
    funds: funds.filter((f) => !f.isArchived).length,
    value: t.value,
    gain: t.gain,
    gainPct: t.gainPct,
    dayChange: t.dayChange,
    monthGrowth,
    monthPct,
    slices: list.filter((p) => p.units > 0).map((p) => ({ color: p.fund.color, value: p.value, ticker: p.fund.ticker })),
    savings,
  };
}

export const getInvestGlance = cache(loadInvestGlance);
