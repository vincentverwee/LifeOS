import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { parseEodhd, parseYahooChart, toEodhdTicker } from "@/lib/invest/prices";
import { addDays } from "@/lib/invest/stats";
import { PRICE_MAX_AGE_MS, PRICE_RETRY_MS, type FundHit, type PricePoint } from "@/lib/invest/types";

// Prices are only ever fetched here: from the push cron (every ~6 h per fund), when a
// fund is added, and by the "Refresh prices" button. Pages read stored closes only.

const TIMEOUT_MS = 4000;
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; personal-portfolio/1.0)", Accept: "application/json" };
const utc = (key: string) => new Date(`${key}T00:00:00Z`);

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Yahoo's chart endpoint (no key, unofficial). */
async function fromYahoo(ticker: string, from: string): Promise<{ prices: PricePoint[]; currency: string | null; name: string | null }> {
  const period1 = Math.floor(utc(from).getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&period1=${period1}&period2=${period2}`;
  const parsed = parseYahooChart(await getJson(url));
  if (!parsed) throw new Error("Yahoo had no chart");
  return parsed;
}

/** EODHD (EODHD_API_KEY, free tier ≈20 calls a day): only when Yahoo fails. */
async function fromEodhd(ticker: string, from: string): Promise<PricePoint[]> {
  const key = process.env.EODHD_API_KEY;
  const symbol = toEodhdTicker(ticker);
  if (!key || !symbol) throw new Error("no EODHD");
  const url = `https://eodhd.com/api/eod/${encodeURIComponent(symbol)}?fmt=json&from=${from}&api_token=${encodeURIComponent(key)}`;
  const prices = parseEodhd(await getJson(url));
  if (!prices) throw new Error("EODHD had no prices");
  return prices;
}

export type Fetched = { prices: PricePoint[]; currency: string | null; name: string | null; source: "yahoo" | "eodhd" };

/** Daily closes since `from`: Yahoo, else EODHD; null when both fail. */
export async function fetchCloses(ticker: string, from: string): Promise<Fetched | null> {
  try {
    return { ...(await fromYahoo(ticker, from)), source: "yahoo" };
  } catch (e) {
    console.warn(`[invest] Yahoo failed for ${ticker}:`, e instanceof Error ? e.message : e);
  }
  try {
    return { prices: await fromEodhd(ticker, from), currency: null, name: null, source: "eodhd" };
  } catch (e) {
    console.warn(`[invest] EODHD failed for ${ticker}:`, e instanceof Error ? e.message : e);
  }
  return null;
}

/** Replaces the stored closes from the first fetched day on (the newest one may have been "so far"). */
async function storePrices(instrumentId: string, prices: PricePoint[]) {
  await prisma.$transaction([
    ...(prices.length > 0
      ? [
          prisma.instrumentPrice.deleteMany({ where: { instrumentId, date: { gte: utc(prices[0].date) } } }),
          prisma.instrumentPrice.createMany({ data: prices.map((p) => ({ instrumentId, date: utc(p.date), close: p.close })) }),
        ]
      : []),
    prisma.instrument.update({ where: { id: instrumentId }, data: { pricesFetchedAt: new Date() } }),
  ]);
}

/** Where a fund's fetch starts: a week before its newest close, else a year before its first trade (or today). */
async function fetchFrom(instrumentId: string): Promise<string> {
  const [latest, firstTrade] = await Promise.all([
    prisma.instrumentPrice.findFirst({ where: { instrumentId }, orderBy: { date: "desc" }, select: { date: true } }),
    prisma.investmentTx.findFirst({ where: { instrumentId }, orderBy: { date: "asc" }, select: { date: true } }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  if (latest) {
    const from = addDays(dayKey(latest.date), -7);
    // A trade back-dated before the stored history needs the older closes too.
    if (firstTrade && dayKey(firstTrade.date) < from) return addDays(dayKey(firstTrade.date), -7);
    return from;
  }
  return addDays(firstTrade ? dayKey(firstTrade.date) : today, -365);
}

/** Fetches and stores one fund's closes; false when no source answered (tried again in ~1 h). */
export async function refreshFund(id: string, ticker: string): Promise<boolean> {
  const fetched = await fetchCloses(ticker, await fetchFrom(id));
  if (!fetched) {
    await prisma.instrument.update({ where: { id }, data: { pricesFetchedAt: new Date(Date.now() - PRICE_MAX_AGE_MS + PRICE_RETRY_MS) } });
    return false;
  }
  await storePrices(id, fetched.prices);
  return true;
}

/** Called by /api/push/cron: refreshes every active fund whose prices are over 6 h old. */
export async function refreshPricesIfStale(): Promise<{ refreshed: string[]; failed: string[] }> {
  const stale = await prisma.instrument.findMany({
    where: { isArchived: false, OR: [{ pricesFetchedAt: null }, { pricesFetchedAt: { lt: new Date(Date.now() - PRICE_MAX_AGE_MS) } }] },
    select: { id: true, ticker: true },
  });
  const refreshed: string[] = [];
  const failed: string[] = [];
  for (const f of stale) {
    const ok = await refreshFund(f.id, f.ticker).catch((e) => {
      console.error(`[invest] storing prices for ${f.ticker} failed`, e);
      return false;
    });
    (ok ? refreshed : failed).push(f.ticker);
  }
  return { refreshed, failed };
}

/** Yahoo's search, for adding a fund by ISIN, name or ticker (only on a tap in Settings). */
export async function searchFunds(query: string): Promise<FundHit[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;
  const json = (await getJson(url)) as { quotes?: { symbol?: string; shortname?: string; longname?: string; exchDisp?: string; exchange?: string; quoteType?: string }[] };
  return (json.quotes ?? [])
    .filter((q) => q.symbol && (q.quoteType === "ETF" || q.quoteType === "MUTUALFUND" || q.quoteType === "EQUITY"))
    .map((q) => ({
      ticker: q.symbol!,
      name: q.longname ?? q.shortname ?? q.symbol!,
      exchange: q.exchDisp ?? q.exchange ?? "",
      type: q.quoteType ?? "",
    }));
}
