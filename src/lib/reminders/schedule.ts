// Pure reminder date math on "YYYY-MM-DD" keys (UTC midnight, like every date-only column).

/** Finished one-offs stay on the Finished tab this long, then they are deleted. */
export const FINISHED_DAYS = 30;

export const REPEATS = ["once", "daily", "weekly", "monthly"] as const;
export type Repeat = (typeof REPEATS)[number];

/** Weekdays as `Date.getUTCDay()` numbers (0 = Sunday), listed Monday first. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;

export type Reminder = {
  id: string;
  title: string;
  repeat: Repeat;
  /** "YYYY-MM-DD", null = undated one-off */
  dueOn: string | null;
  anchorDay: number | null;
  /** Weekly: the days it comes back on (0 = Sunday). */
  weekdays: number[];
};

type Schedule = Pick<Reminder, "repeat" | "anchorDay" | "weekdays">;

export function isRepeat(value: unknown): value is Repeat {
  return typeof value === "string" && (REPEATS as readonly string[]).includes(value);
}

function toDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function weekdayOf(key: string): number {
  return toDate(key).getUTCDay();
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
export function nextMonth(key: string, anchorDay: number): string {
  const date = toDate(key);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return toKey(new Date(Date.UTC(year, month, Math.min(anchorDay, lastDay))));
}

/** Weekly days to use: the chosen ones, or the weekday of `dueOn` when none are stored. */
function daysOf(weekdays: number[], dueOn: string): number[] {
  // Out-of-range days would never match and loop onOrAfterWeekday forever.
  const valid = weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return valid.length ? valid : [weekdayOf(dueOn)];
}

/** First chosen weekday on or after `key`. */
function onOrAfterWeekday(key: string, weekdays: number[]): string {
  let next = key;
  while (!weekdays.includes(weekdayOf(next))) next = addDays(next, 1);
  return next;
}

/** Where a new or edited reminder starts: weekly ones move to their first chosen day from `start`. */
export function firstDueOn(repeat: Repeat, start: string, weekdays: number[]): string {
  return repeat === "weekly" ? onOrAfterWeekday(start, daysOf(weekdays, start)) : start;
}

export function isOpen(reminder: Pick<Reminder, "dueOn">, todayKey: string): boolean {
  return reminder.dueOn === null || reminder.dueOn <= todayKey;
}

/** Where a repeating reminder goes once ticked off: its first date after today (missed ones don't pile up). */
export function nextDueAfter(schedule: Schedule, dueOn: string, todayKey: string): string {
  if (schedule.repeat === "monthly") {
    const anchor = schedule.anchorDay ?? toDate(dueOn).getUTCDate();
    let next = dueOn;
    do next = nextMonth(next, anchor);
    while (next <= todayKey);
    return next;
  }
  const from = addDays(dueOn > todayKey ? dueOn : todayKey, 1);
  return schedule.repeat === "weekly" ? onOrAfterWeekday(from, daysOf(schedule.weekdays, dueOn)) : from;
}

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });
const weekdayShortFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Mon", "Tue", … for a weekday number (4 Jan 1970 was a Sunday). */
export function weekdayName(day: number, style: "short" | "long" = "short"): string {
  const date = new Date(Date.UTC(1970, 0, 4 + day));
  return (style === "long" ? weekdayFormatter : weekdayShortFormatter).format(date);
}

export function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

/** "Every day" / "Every Monday" / "Every Mon, Wed" / "Every month on the 15th" / null for one-offs. */
export function describeRepeat(schedule: Schedule, dueOn: string | null): string | null {
  if (schedule.repeat === "once" || !dueOn) return null;
  if (schedule.repeat === "daily") return "Every day";
  if (schedule.repeat === "monthly") return `Every month on the ${ordinal(schedule.anchorDay ?? toDate(dueOn).getUTCDate())}`;
  const days = WEEKDAYS.filter((d) => daysOf(schedule.weekdays, dueOn).includes(d));
  if (days.length === 7) return "Every day";
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Every weekday";
  if (days.length === 1) return `Every ${weekdayName(days[0], "long")}`;
  return `Every ${days.map((d) => weekdayName(d)).join(", ")}`;
}

/** "Fri 31 Oct" */
export function formatDay(key: string): string {
  return shortDateFormatter.format(toDate(key));
}

/** "Today" / "Tomorrow" / "2 days overdue" / "Fri 31 Oct"; null when undated. */
export function describeDue(dueOn: string | null, todayKey: string): string | null {
  if (!dueOn) return null;
  const days = daysBetween(todayKey, dueOn);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${-days} ${days === -1 ? "day" : "days"} overdue`;
  return formatDay(dueOn);
}

/** "today" / "yesterday" / "3 days ago" */
export function describeDoneOn(doneOn: string, todayKey: string): string {
  const days = daysBetween(doneOn, todayKey);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
