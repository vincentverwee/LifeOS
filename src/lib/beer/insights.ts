// Pure math for /beer/insights. A "month" is a calendar month ("YYYY-MM"); beer has no
// budget periods. Pints are pintsIn() (counted, else guessed), so the numbers match
// Overview and Budget; prices per pint use counted beers only (totals()).

import { addDays, weekdayOf } from "@/lib/reminders/schedule";
import { pintsIn, totals, type BeerTotals, type BeerVisit } from "@/lib/beer/stats";

export const monthOf = (dayKey: string) => dayKey.slice(0, 7);

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Months from `from` to `to`, inclusive, oldest first. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

export function inMonth(visits: BeerVisit[], month: string): BeerVisit[] {
  return visits.filter((v) => monthOf(v.date) === month);
}

/** Running pints at the end of each day of the month (index 0 = day 1). */
export function runningPints(visits: BeerVisit[], month: string): number[] {
  const perDay = new Array<number>(daysInMonth(month)).fill(0);
  for (const v of inMonth(visits, month)) perDay[Number(v.date.slice(8, 10)) - 1] += pintsIn(v);
  let sum = 0;
  return perDay.map((n) => (sum += n));
}

/** The day of `month` to compare at: today in the running month, the last day of a finished one, 0 ahead. */
export function comparisonDay(month: string, todayKey: string): number {
  const today = monthOf(todayKey);
  if (month < today) return daysInMonth(month);
  if (month === today) return Number(todayKey.slice(8, 10));
  return 0;
}

export type Usual = {
  /** average running pints per day of the month; shorter months hold their last day */
  byDay: number[];
  /** "September" with one month to compare with, else "your usual month" */
  label: string;
  months: number;
};

const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
export const monthTitle = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
export const toDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

/**
 * The usual month: every finished month since the first beer (dry ones included),
 * except `month` itself, averaged day by day. Null when there's none yet.
 */
export function usualMonth(visits: BeerVisit[], month: string, todayKey: string): Usual | null {
  if (visits.length === 0) return null;
  const lastFinished = shiftMonth(monthOf(todayKey), -1);
  const peers = monthsBetween(monthOf(visits[0].date), lastFinished).filter((m) => m !== month);
  if (peers.length === 0) return null;
  const length = daysInMonth(month);
  const runs = peers.map((m) => runningPints(visits, m));
  const byDay = Array.from({ length }, (_, i) => {
    const sum = runs.reduce((s, run) => s + run[Math.min(i, run.length - 1)], 0);
    return Math.round((sum / runs.length) * 10) / 10;
  });
  return {
    byDay,
    label: peers.length === 1 ? monthName.format(toDate(peers[0])) : "your usual month",
    months: peers.length,
  };
}

export type PubMonthRow = { pubId: string | null; name: string; totals: BeerTotals };

/** Per pub in the given visits, most pints first; beers without a pub are one "No pub" row, last. */
export function byPub(visits: BeerVisit[]): PubMonthRow[] {
  const groups = new Map<string | null, BeerVisit[]>();
  for (const v of visits) {
    const list = groups.get(v.pubId);
    if (list) list.push(v);
    else groups.set(v.pubId, [v]);
  }
  return [...groups]
    .map(([pubId, list]) => ({ pubId, name: list[0].pubName ?? "No pub", totals: totals(list) }))
    .filter((r) => r.totals.pints > 0 || r.totals.spend > 0)
    .sort((a, b) => Number(a.pubId === null) - Number(b.pubId === null) || b.totals.pints - a.totals.pints);
}

export type BeerWeekday = { label: string; pints: number; nights: number };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Pints per weekday (Monday first) over the year up to `asOf`; `nights` = days with a pint. */
export function weekdays(visits: BeerVisit[], asOf: string): BeerWeekday[] {
  const from = addDays(asOf, -364);
  const rows = WEEKDAYS.map((label) => ({ label, pints: 0, nights: new Set<string>() }));
  for (const v of visits) {
    if (v.date < from || v.date > asOf) continue;
    const n = pintsIn(v);
    if (n === 0) continue;
    const row = rows[(weekdayOf(v.date) + 6) % 7]; // getUTCDay: 0 = Sunday
    row.pints += n;
    row.nights.add(v.date);
  }
  return rows.map((r) => ({ label: r.label, pints: r.pints, nights: r.nights.size }));
}

export type BigNight = { date: string; pints: number; spend: number; pubs: string[] };

/** The days with the most pints, ties broken by spend. */
export function biggestNights(visits: BeerVisit[], count = 5): BigNight[] {
  const days = new Map<string, BigNight>();
  for (const v of visits) {
    const n = pintsIn(v);
    if (n === 0) continue;
    const day = days.get(v.date) ?? { date: v.date, pints: 0, spend: 0, pubs: [] };
    day.pints += n;
    day.spend += v.amount;
    if (v.pubName && !day.pubs.includes(v.pubName)) day.pubs.push(v.pubName);
    days.set(v.date, day);
  }
  return [...days.values()].sort((a, b) => b.pints - a.pints || b.spend - a.spend).slice(0, count);
}

export type MonthRow = { month: string; totals: BeerTotals };

/** Every month from the first beer to `last`, oldest first (dry months included). */
export function everyMonth(visits: BeerVisit[], last: string): MonthRow[] {
  if (visits.length === 0) return [];
  return monthsBetween(monthOf(visits[0].date), last).map((month) => ({ month, totals: totals(inMonth(visits, month)) }));
}
