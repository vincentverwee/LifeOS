// Pure reminder date math on "YYYY-MM-DD" keys (UTC midnight, like every date-only column).

export const REPEATS = ["once", "weekly", "monthly"] as const;
export type Repeat = (typeof REPEATS)[number];

export const REPEAT_LABELS: Record<Repeat, string> = {
  once: "Once",
  weekly: "Every week",
  monthly: "Every month",
};

export type Reminder = {
  id: string;
  title: string;
  repeat: Repeat;
  /** "YYYY-MM-DD", null = undated one-off */
  dueOn: string | null;
  anchorDay: number | null;
};

export function isRepeat(value: unknown): value is Repeat {
  return typeof value === "string" && (REPEATS as readonly string[]).includes(value);
}

function toDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  const date = toDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date);
}

/** Days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

/** The `anchorDay` of the month after `key`'s, clamped to that month's length (31 → 30 Nov). */
function nextMonth(key: string, anchorDay: number): string {
  const date = toDate(key);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return toKey(new Date(Date.UTC(year, month, Math.min(anchorDay, lastDay))));
}

export function isOpen(reminder: Pick<Reminder, "dueOn">, todayKey: string): boolean {
  return reminder.dueOn === null || reminder.dueOn <= todayKey;
}

/** Where a recurring reminder goes once ticked off: its first date after today (missed ones don't pile up). */
export function nextDueAfter(repeat: Repeat, dueOn: string, anchorDay: number | null, todayKey: string): string {
  let next = dueOn;
  const anchor = anchorDay ?? toDate(dueOn).getUTCDate();
  do {
    next = repeat === "weekly" ? addDays(next, 7) : nextMonth(next, anchor);
  } while (next <= todayKey);
  return next;
}

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

/** "Every Monday" / "Every month on the 15th" / null for one-offs. */
export function describeRepeat(repeat: Repeat, dueOn: string | null, anchorDay: number | null): string | null {
  if (repeat === "once" || !dueOn) return null;
  if (repeat === "weekly") return `Every ${weekdayFormatter.format(toDate(dueOn))}`;
  return `Every month on the ${ordinal(anchorDay ?? toDate(dueOn).getUTCDate())}`;
}

/** "Today" / "Tomorrow" / "2 days overdue" / "Fri 31 Oct"; null when undated. */
export function describeDue(dueOn: string | null, todayKey: string): string | null {
  if (!dueOn) return null;
  const days = daysBetween(todayKey, dueOn);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${-days} ${days === -1 ? "day" : "days"} overdue`;
  return shortDateFormatter.format(toDate(dueOn));
}
