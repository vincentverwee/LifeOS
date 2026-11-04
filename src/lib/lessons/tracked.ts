// Tracked time (courses with `countsAsStudy` off, e.g. Ekonomika, Projectvak): pure math on
// "YYYY-MM-DD" keys. Separate from study (stats.ts): nothing here feeds study numbers.
// `key` groups entries: the course name, so the same activity adds up across semesters.
import { addDays } from "@/lib/reminders/schedule";

export type TrackedLite = { date: string; minutes: number; key: string };

/** 1 September that starts the academic year `todayKey` falls in. */
export function academicYearStart(todayKey: string): string {
  const year = Number(todayKey.slice(0, 4));
  const month = Number(todayKey.slice(5, 7));
  return `${month >= 9 ? year : year - 1}-09-01`;
}

/** The Monday of the week `key` falls in. */
export function weekStart(key: string): string {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(key, -((weekday + 6) % 7));
}

/** Minutes this week (Mon–today), this calendar month and since 1 September. */
export function trackedTotals(entries: TrackedLite[], todayKey: string): { week: number; month: number; year: number } {
  const week = weekStart(todayKey);
  const month = `${todayKey.slice(0, 7)}-01`;
  const year = academicYearStart(todayKey);
  const sum = (from: string) =>
    entries.filter((e) => e.date >= from && e.date <= todayKey).reduce((total, e) => total + e.minutes, 0);
  return { week: sum(week), month: sum(month), year: sum(year) };
}

export type TrackedWeek = { start: string; total: number; byKey: Record<string, number> };

/** The last `count` weeks (Monday starts), oldest first, with minutes per key. */
export function trackedWeeks(entries: TrackedLite[], todayKey: string, count = 12): TrackedWeek[] {
  const last = weekStart(todayKey);
  const weeks: TrackedWeek[] = [];
  for (let i = count - 1; i >= 0; i--) weeks.push({ start: addDays(last, -7 * i), total: 0, byKey: {} });
  const byStart = new Map(weeks.map((w) => [w.start, w]));
  for (const e of entries) {
    const week = byStart.get(weekStart(e.date));
    if (!week || e.date > todayKey) continue;
    week.total += e.minutes;
    week.byKey[e.key] = (week.byKey[e.key] ?? 0) + e.minutes;
  }
  return weeks;
}

/** Minutes per key from `from` up to today, largest first. */
export function trackedByKey(entries: TrackedLite[], from: string, todayKey: string): { key: string; minutes: number }[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.date < from || e.date > todayKey) continue;
    totals.set(e.key, (totals.get(e.key) ?? 0) + e.minutes);
  }
  return [...totals.entries()].map(([key, minutes]) => ({ key, minutes })).sort((a, b) => b.minutes - a.minutes);
}

/** "3 h 20", "2 h", "45 min", "0 min". */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, "0")}`;
}

/** Minutes from "HH:MM" to "HH:MM"; an end before the start runs past midnight. Null when unreadable or equal. */
export function minutesBetween(from: string, to: string): number | null {
  const parse = (t: string) => {
    const match = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const [h, m] = [Number(match[1]), Number(match[2])];
    return h < 24 && m < 60 ? h * 60 + m : null;
  };
  const a = parse(from);
  const b = parse(to);
  if (a === null || b === null || a === b) return null;
  return b > a ? b - a : b + 1440 - a;
}
