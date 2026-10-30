// Pure birthday math on "YYYY-MM-DD" keys (UTC midnight, like every date-only column).
import { daysBetween, formatDay } from "@/lib/reminders/schedule";

/** Digest lines go out this many days before a birthday (0 = the day itself). */
export const BIRTHDAY_HEADS_UP_DAYS = [0, 1, 7];
/** "Coming up" on the home tile. */
export const SOON_DAYS = 30;

export const GIFT_STATUSES = ["idea", "bought", "given"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

export function isGiftStatus(value: unknown): value is GiftStatus {
  return typeof value === "string" && (GIFT_STATUSES as readonly string[]).includes(value);
}

export type Birthday = { birthMonth: number; birthDay: number; birthYear: number | null };

/** The birthday as stored (all three columns null = none known). */
export function birthdayOf(row: { birthMonth: number | null; birthDay: number | null; birthYear: number | null }): Birthday | null {
  return row.birthMonth === null || row.birthDay === null
    ? null
    : { birthMonth: row.birthMonth, birthDay: row.birthDay, birthYear: row.birthYear };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Month 1–12 and a day that month can have (29 Feb counts); with a year, that exact date must exist. */
export function isValidBirthday({ birthMonth, birthDay, birthYear }: Birthday): boolean {
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) return false;
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2100)) return false;
  const max = daysInMonth(birthYear ?? 2000, birthMonth); // 2000 is a leap year, so 29 Feb passes without a year
  return Number.isInteger(birthDay) && birthDay >= 1 && birthDay <= max;
}

/** The birthday in `year`; 29 February falls on the 28th in other years. */
export function birthdayIn(year: number, { birthMonth, birthDay }: Pick<Birthday, "birthMonth" | "birthDay">): string {
  const day = birthMonth === 2 && birthDay === 29 && !isLeapYear(year) ? 28 : birthDay;
  return `${year}-${String(birthMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The first birthday on or after today. */
export function nextBirthday(person: Pick<Birthday, "birthMonth" | "birthDay">, todayKey: string): string {
  const year = Number(todayKey.slice(0, 4));
  const thisYear = birthdayIn(year, person);
  return thisYear >= todayKey ? thisYear : birthdayIn(year + 1, person);
}

/** The age they turn on `birthdayKey`; null without a birth year. */
export function turningAge(person: Pick<Birthday, "birthYear">, birthdayKey: string): number | null {
  return person.birthYear === null ? null : Number(birthdayKey.slice(0, 4)) - person.birthYear;
}

export type Upcoming = { nextOn: string; daysUntil: number; turning: number | null };

export function upcoming(person: Birthday, todayKey: string): Upcoming {
  const nextOn = nextBirthday(person, todayKey);
  return { nextOn, daysUntil: daysBetween(todayKey, nextOn), turning: turningAge(person, nextOn) };
}

/** "Today" / "Tomorrow" / "In 5 days" / "Fri 31 Oct" (from two weeks out). */
export function describeCountdown(daysUntil: number, nextOn: string): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil < 14) return `In ${daysUntil} days`;
  return formatDay(nextOn);
}

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

/** "7 November" / "7 November 1996" */
export function formatBirthday({ birthMonth, birthDay, birthYear }: Birthday): string {
  const month = monthFormatter.format(new Date(Date.UTC(2000, birthMonth - 1, 1)));
  return `${birthDay} ${month}${birthYear ? ` ${birthYear}` : ""}`;
}

/** Month names for the form, January first. */
export const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => monthFormatter.format(new Date(Date.UTC(2000, i, 1))));
