// Pure Last done insights on "YYYY-MM-DD" keys.
import { addDays, daysBetween, weekdayOf } from "./schedule";

/** How far back the Insights page looks. */
export const INSIGHT_DAYS = 365;
/** Columns in the calendar (one per week, Monday at the top). */
export const CALENDAR_WEEKS = 17;

export type RoutineLogs = {
  id: string;
  name: string;
  everyDays: number | null;
  /** Oldest first, within INSIGHT_DAYS. */
  doneOns: string[];
};

export type RoutineStats = {
  count: number;
  last30: number;
  /** Middle gap between two logs; one odd week doesn't skew it. Null with fewer than two logs. */
  typicalGap: number | null;
  longestGap: number | null;
  /** Share (0–1) of gaps within `everyDays`; null without a nudge or gaps. */
  onTime: number | null;
};

function gaps(doneOns: string[]): number[] {
  return doneOns.slice(1).map((key, i) => daysBetween(doneOns[i], key));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function routineStats(routine: RoutineLogs, todayKey: string): RoutineStats {
  const between = gaps(routine.doneOns);
  const from30 = addDays(todayKey, -29);
  return {
    count: routine.doneOns.length,
    last30: routine.doneOns.filter((key) => key >= from30).length,
    typicalGap: median(between),
    longestGap: between.length ? Math.max(...between) : null,
    onTime:
      routine.everyDays !== null && between.length
        ? between.filter((gap) => gap <= routine.everyDays!).length / between.length
        : null,
  };
}

/** Logs in the calendar month of `monthKey` up to its day-of-month (so a half month compares fairly). */
export function countMonthToDate(doneOns: string[], monthKey: string): number {
  const prefix = monthKey.slice(0, 8);
  return doneOns.filter((key) => key.startsWith(prefix) && key <= monthKey).length;
}

/** The same day one month earlier, clamped (31 Mar → 28/29 Feb). */
export function sameDayLastMonth(todayKey: string): string {
  const [y, m, d] = todayKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 2, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

export type CalendarDay = { key: string; count: number; future: boolean };

/** CALENDAR_WEEKS Monday-first weeks ending with this week; `count` = logs that day. */
export function calendarWeeks(doneOns: string[], todayKey: string): CalendarDay[][] {
  const counts = new Map<string, number>();
  for (const key of doneOns) counts.set(key, (counts.get(key) ?? 0) + 1);
  const monday = addDays(todayKey, -((weekdayOf(todayKey) + 6) % 7));
  const start = addDays(monday, -7 * (CALENDAR_WEEKS - 1));
  return Array.from({ length: CALENDAR_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(start, w * 7 + d);
      return { key, count: counts.get(key) ?? 0, future: key > todayKey };
    })
  );
}

/** Logs per weekday, Monday first. */
export function weekdayCounts(doneOns: string[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const key of doneOns) counts[(weekdayOf(key) + 6) % 7]++;
  return counts;
}
