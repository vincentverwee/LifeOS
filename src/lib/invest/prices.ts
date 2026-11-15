// Pure: turning Yahoo's and EODHD's replies into daily closes, and ticker helpers.
// The fetching itself lives in src/lib/data/investPrices.ts (server only).
import type { PricePoint } from "./types";

/** Yahoo's chart reply, only the parts we read. */
type YahooChart = {
  chart?: {
    result?: {
      meta?: { currency?: string; gmtoffset?: number; longName?: string; shortName?: string; symbol?: string };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[] | null;
    error?: unknown;
  };
};

export type ParsedChart = { prices: PricePoint[]; currency: string | null; name: string | null };

/**
 * Closes from `query1.finance.yahoo.com/v8/finance/chart/<ticker>?interval=1d`. Each
 * timestamp is the bar's start in UTC; shifted by the exchange's offset it gives the
 * trading day. The newest bar during trading hours is the price so far (stored, and
 * overwritten by the next fetch). One point per day, oldest first.
 */
export function parseYahooChart(json: unknown): ParsedChart | null {
  const result = (json as YahooChart)?.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0]?.close) return null;
  const offset = result.meta?.gmtoffset ?? 0;
  const closes = result.indicators.quote[0].close;
  const byDay = new Map<string, number>();
  result.timestamp.forEach((ts, i) => {
    const close = closes[i];
    if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) return;
    byDay.set(new Date((ts + offset) * 1000).toISOString().slice(0, 10), roundPrice(close));
  });
  const prices = [...byDay].map(([date, close]) => ({ date, close })).sort((a, b) => (a.date < b.date ? -1 : 1));
  return { prices, currency: result.meta?.currency ?? null, name: result.meta?.longName ?? result.meta?.shortName ?? null };
}

/** Closes from EODHD's `/api/eod/<ticker>?fmt=json`: [{ date, close, … }]. */
export function parseEodhd(json: unknown): PricePoint[] | null {
  if (!Array.isArray(json)) return null;
  const out: PricePoint[] = [];
  for (const row of json) {
    const date = (row as { date?: unknown })?.date;
    const close = (row as { close?: unknown })?.close;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) continue;
    out.push({ date, close: roundPrice(close) });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Yahoo exchange suffix → EODHD exchange code. */
const EODHD_EXCHANGES: Record<string, string> = {
  DE: "XETRA",
  AS: "AS",
  PA: "PA",
  BR: "BR",
  MI: "MI",
  L: "LSE",
  SW: "SW",
  F: "F",
  MC: "MC",
  VI: "VI",
  LS: "LS",
  IR: "IR",
};

/** "VWCE.DE" → "VWCE.XETRA"; a ticker without a suffix is taken as US. */
export function toEodhdTicker(ticker: string): string | null {
  const [symbol, suffix] = ticker.split(".");
  if (!symbol) return null;
  if (!suffix) return `${symbol}.US`;
  const exchange = EODHD_EXCHANGES[suffix.toUpperCase()];
  return exchange ? `${symbol}.${exchange}` : null;
}

/** Tidies a typed ticker: trims and upper-cases ("vwce.de" → "VWCE.DE"). */
export function normalizeTicker(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{0,14}(\.[A-Z]{1,4})?$/.test(t) ? t : null;
}

/** An ISIN: two letters, nine characters, one check digit (the check digit itself isn't verified). */
export function isIsin(raw: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(raw.trim().toUpperCase());
}

function roundPrice(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
