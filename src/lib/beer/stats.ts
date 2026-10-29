// Pure beer math for /beer (no server-only imports). Pints come from pintsOf()
// in monthStats.ts (counted, else guessed), so Budget and Beer always agree; prices
// per pint only use counted beers, since a guess is just the category's price.

import { pintsOf } from "@/lib/monthStats";

export type BeerVisit = {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  amount: number;
  /** pints counted when logged, null = guessed */
  counted: number | null;
  pintPrice: number;
  pubId: string | null;
  pubName: string | null;
  note: string | null;
};

export type PubRow = { id: string; name: string; latitude: number | null; longitude: number | null; osmId: string | null };

export type PubStats = PubRow & {
  /** days with a beer here */
  visits: number;
  pints: number;
  spend: number;
  /** counted beers only; null when none was counted */
  pricePerPint: number | null;
  firstVisit: string | null;
  lastVisit: string | null;
};

export type BeerTotals = { pints: number; spend: number; pricePerPint: number | null; days: number };

export function pintsIn(v: BeerVisit): number {
  return pintsOf({ amount: v.amount, pintPrice: v.pintPrice, pints: v.counted });
}

/** Spend and pints of the beers that count as pints (a cheap one is food, see MIN_PINT_AMOUNT). */
export function totals(visits: BeerVisit[]): BeerTotals {
  let pints = 0;
  let spend = 0;
  let countedPints = 0;
  let countedSpend = 0;
  const days = new Set<string>();
  for (const v of visits) {
    const n = pintsIn(v);
    if (n === 0) continue;
    pints += n;
    spend += v.amount;
    days.add(v.date);
    if (v.counted) {
      countedPints += v.counted;
      countedSpend += v.amount;
    }
  }
  return { pints, spend, pricePerPint: countedPints > 0 ? countedSpend / countedPints : null, days: days.size };
}

/** One row per pub, most visited first. Pubs without beers are kept (0 visits). */
export function pubStats(pubs: PubRow[], visits: BeerVisit[]): PubStats[] {
  const byPub = new Map<string, BeerVisit[]>();
  for (const v of visits) {
    if (!v.pubId) continue;
    const list = byPub.get(v.pubId);
    if (list) list.push(v);
    else byPub.set(v.pubId, [v]);
  }
  return pubs
    .map((pub) => {
      const list = byPub.get(pub.id) ?? [];
      const t = totals(list);
      const dates = list.map((v) => v.date).sort();
      return {
        ...pub,
        visits: new Set(dates).size,
        pints: t.pints,
        spend: t.spend,
        pricePerPint: t.pricePerPint,
        firstVisit: dates[0] ?? null,
        lastVisit: dates.at(-1) ?? null,
      };
    })
    .sort((a, b) => b.visits - a.visits || (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""));
}

/** Visits between two day keys, inclusive. */
export function between(visits: BeerVisit[], from: string, to: string): BeerVisit[] {
  return visits.filter((v) => v.date >= from && v.date <= to);
}

export type MonthPrice = { month: string; pricePerPint: number; pints: number };

/** Counted price per pint per calendar month ("YYYY-MM"), oldest first. */
export function pricesByMonth(visits: BeerVisit[]): MonthPrice[] {
  const months = new Map<string, { spend: number; pints: number }>();
  for (const v of visits) {
    if (!v.counted) continue;
    const key = v.date.slice(0, 7);
    const m = months.get(key) ?? { spend: 0, pints: 0 };
    m.spend += v.amount;
    m.pints += v.counted;
    months.set(key, m);
  }
  return [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, m]) => ({ month, pricePerPint: m.spend / m.pints, pints: m.pints }));
}

/** First day of the calendar month of `key`, and of the month before. */
export function monthStarts(key: string): { thisMonth: string; lastMonth: string; lastMonthEnd: string } {
  const [y, m] = key.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const lastDay = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  return {
    thisMonth: `${y}-${pad(m)}-01`,
    lastMonth: `${prevY}-${pad(prevM)}-01`,
    lastMonthEnd: `${prevY}-${pad(prevM)}-${pad(lastDay)}`,
  };
}
