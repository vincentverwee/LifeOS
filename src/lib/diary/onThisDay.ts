// Pure date math for the diary's "On this day" (no server imports, tested in onThisDay.test.ts).

/** Longest single bit of a day (one line of `DiaryEntry.text`). */
export const MAX_BIT_LENGTH = 280;

/** Longest whole day, all bits plus their line breaks (CHECK diary_entry in prisma/checks.ts). */
export const MAX_DIARY_LENGTH = 2000;

/** A bit with its inner whitespace (incl. line breaks) collapsed to single spaces. */
export function cleanBit(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** The bits of a day's text: one per line, cleaned, empty lines dropped. */
export function diaryBits(text: string): string[] {
  return text.split("\n").map(cleanBit).filter(Boolean);
}

/** How far back "On this day" looks. */
export const PAST_YEARS = 15;

export const MOODS = [
  { value: 1, face: "😞", label: "Rough" },
  { value: 2, face: "🙁", label: "Meh" },
  { value: 3, face: "😐", label: "Okay" },
  { value: 4, face: "🙂", label: "Good" },
  { value: 5, face: "😄", label: "Great" },
] as const;

export function moodOf(value: number | null | undefined): (typeof MOODS)[number] | null {
  return MOODS.find((m) => m.value === value) ?? null;
}

export function isMood(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function key(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type PastDay = { yearsAgo: number; year: number; keys: string[] };

/**
 * The same day in each of the `years` years before `dateKey`, newest first. Each year
 * lists the date keys that count as "this day": 29 Feb falls on the 28th in other years,
 * and on 28 Feb of a non-leap year a leap year's 29 Feb counts too.
 */
export function sameDayInPastYears(dateKey: string, years = PAST_YEARS): PastDay[] {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const leapDayGroup = month === 2 && (day === 29 || (day === 28 && !isLeapYear(year)));

  const out: PastDay[] = [];
  for (let n = 1; n <= years; n++) {
    const y = year - n;
    let keys: string[];
    if (!leapDayGroup) keys = [key(y, month, day)];
    else if (day === 28) keys = isLeapYear(y) ? [key(y, 2, 28), key(y, 2, 29)] : [key(y, 2, 28)];
    else keys = [key(y, 2, isLeapYear(y) ? 29 : 28)];
    out.push({ yearsAgo: n, year: y, keys });
  }
  return out;
}

/** "1 year ago" / "3 years ago" */
export function describeYearsAgo(n: number): string {
  return `${n} ${n === 1 ? "year" : "years"} ago`;
}

/** Day number of `dateKey` inside a trip that started on `startKey` (the first day is 1). */
export function dayOfTrip(startKey: string, dateKey: string): number {
  const ms = Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${startKey}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}
