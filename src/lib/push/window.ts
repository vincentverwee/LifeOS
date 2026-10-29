import { addDays, daysBetween, weekdayOf } from "@/lib/reminders/schedule";
import { defaultPushTime, minutesOf, type PushTimes, type TimedPushKind } from "@/lib/push/kinds";

// The pure timing parts of the push scheduler (src/lib/push/schedule.ts), kept
// apart so they can be tested without a database.

/** How long after its time a kind may still be sent (GitHub runs can be late). */
export const WINDOW_HOURS: Record<TimedPushKind, number> = {
  digest: 3,
  "study-evening": 3,
  "budget-evening": 3,
  week: 4, // Sundays only
};

/** Minutes after local midnight in `tz`. */
export function minuteIn(tz: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: tz }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part("hour") * 60 + part("minute");
}

/** Whether `kind` is inside its window at `minute` (local) on `todayKey`. */
export function isKindDueNow(kind: TimedPushKind, minute: number, times: PushTimes, todayKey: string): boolean {
  // Never past midnight: the next day would get its own key and a second send.
  const from = minutesOf(times[kind] ?? defaultPushTime(kind));
  const to = Math.min(from + WINDOW_HOURS[kind] * 60, 24 * 60);
  if (minute < from || minute >= to) return false;
  return kind !== "week" || weekdayOf(todayKey) === 0;
}

/** The rent day as a date in the month of `key` (29–31 clamp to the month's last day). */
export function rentDateIn(key: string, rentDay: number): string {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${key.slice(0, 8)}${String(Math.min(rentDay, last)).padStart(2, "0")}`;
}

export type BudgetRange = { budget: number; start: string; end: string };

/**
 * The budget of the 7 days from `monday`: each day's share of the first range
 * covering it (pass trips before months, so a trip wins, as everywhere else).
 */
export function weekBudget(monday: string, ranges: BudgetRange[]): number {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i)).reduce((sum, day) => {
    const range = ranges.find((r) => r.start <= day && day <= r.end);
    return range ? sum + range.budget / (daysBetween(range.start, range.end) + 1) : sum;
  }, 0);
}
