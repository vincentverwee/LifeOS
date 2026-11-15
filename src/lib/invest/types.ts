// Shared shapes and limits for Investments (pure, used by server and client).

export const TRADE_TYPES = ["buy", "sell", "dividend"] as const;
export type TradeType = (typeof TRADE_TYPES)[number];

export function isTradeType(value: unknown): value is TradeType {
  return (TRADE_TYPES as readonly unknown[]).includes(value);
}

export const TRADE_LABELS: Record<TradeType, string> = { buy: "Buy", sell: "Sell", dividend: "Dividend" };

/** Belgian stock-exchange tax most ETFs pay through Bolero (0.12 %); editable per fund. */
export const DEFAULT_TOB_RATE = 0.0012;

/** Prices older than this are fetched again by the push cron. */
export const PRICE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
/** After a failed fetch, try again after this long (keeps EODHD's 20 calls a day safe). */
export const PRICE_RETRY_MS = 60 * 60 * 1000;
/** The "Refresh prices" button does nothing within this long of the last fetch. */
export const PRICE_MANUAL_MIN_MS = 10 * 60 * 1000;

export const LIMITS = {
  units: 1_000_000,
  price: 1_000_000,
  amount: 1_000_000,
  fees: 10_000,
  note: 200,
  name: 80,
};

/** One fund as the pages see it. */
export type Fund = {
  id: string;
  ticker: string;
  isin: string | null;
  name: string;
  currency: string;
  color: string;
  targetPct: number | null;
  tobRate: number;
  isArchived: boolean;
  pricesFetchedAt: string | null;
};

/** One trade; dates are "YYYY-MM-DD". */
export type Trade = {
  id: string;
  instrumentId: string;
  date: string;
  type: TradeType;
  units: number | null;
  price: number | null;
  amount: number | null;
  fees: number;
  tax: number;
  note: string | null;
};

export type PricePoint = { date: string; close: number };

/** A search result when adding a fund. */
export type FundHit = { ticker: string; name: string; exchange: string; type: string };
