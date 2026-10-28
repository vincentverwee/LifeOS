// Pure subscription date math on "YYYY-MM-DD" keys (UTC midnight, like every date-only column).
import { daysBetween, formatDay, nextMonth, ordinal } from "@/lib/reminders/schedule";

export const SUBSCRIPTION_REPEATS = ["monthly", "yearly"] as const;
export type SubscriptionRepeat = (typeof SUBSCRIPTION_REPEATS)[number];

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  repeat: SubscriptionRepeat;
  /** 1–31; 29–31 fall back to the month's last day. */
  anchorDay: number;
  /** Yearly only, 1–12. */
  anchorMonth: number | null;
  /** The next renewal not yet logged or skipped. */
  nextDueOn: string;
  isActive: boolean;
  note: string | null;
};

type Schedule = Pick<Subscription, "repeat" | "anchorDay" | "anchorMonth">;

export function isSubscriptionRepeat(value: unknown): value is SubscriptionRepeat {
  return typeof value === "string" && (SUBSCRIPTION_REPEATS as readonly string[]).includes(value);
}

/** The schedule a renewal on `dateKey` sets up (the form asks for the next charge date). */
export function anchorsFrom(dateKey: string, repeat: SubscriptionRepeat): Pick<Subscription, "anchorDay" | "anchorMonth"> {
  const [, month, day] = dateKey.split("-").map(Number);
  return { anchorDay: day, anchorMonth: repeat === "yearly" ? month : null };
}

/** The renewal after the one on `key`: next month's anchor day, or next year's (29 Feb → 28 Feb). */
export function renewalAfter(schedule: Schedule, key: string): string {
  if (schedule.repeat === "monthly") return nextMonth(key, schedule.anchorDay);
  const year = Number(key.slice(0, 4)) + 1;
  const month = (schedule.anchorMonth ?? Number(key.slice(5, 7))) - 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(schedule.anchorDay, lastDay))).toISOString().slice(0, 10);
}

/** First renewal on or after `todayKey`, starting from `from` (used when a stopped one is resumed). */
export function renewalOnOrAfter(schedule: Schedule, from: string, todayKey: string): string {
  let next = from;
  while (next < todayKey) next = renewalAfter(schedule, next);
  return next;
}

export function isDue(subscription: Pick<Subscription, "isActive" | "nextDueOn">, todayKey: string): boolean {
  return subscription.isActive && subscription.nextDueOn <= todayKey;
}

export function monthlyCost(subscription: Pick<Subscription, "amount" | "repeat">): number {
  return subscription.repeat === "yearly" ? subscription.amount / 12 : subscription.amount;
}

export function yearlyCost(subscription: Pick<Subscription, "amount" | "repeat">): number {
  return subscription.repeat === "yearly" ? subscription.amount : subscription.amount * 12;
}

const monthDayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "Monthly on the 14th" / "Yearly on 3 Mar" */
export function describeSchedule(schedule: Schedule): string {
  if (schedule.repeat === "monthly") return `Monthly on the ${ordinal(schedule.anchorDay)}`;
  const month = (schedule.anchorMonth ?? 1) - 1;
  return `Yearly on ${monthDayFormatter.format(new Date(Date.UTC(2000, month, schedule.anchorDay)))}`;
}

/** "today" / "tomorrow" / "yesterday" / "3 days ago" / "Fri 31 Oct" */
export function describeRenewal(nextDueOn: string, todayKey: string): string {
  const days = daysBetween(todayKey, nextDueOn);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days ago`;
  return formatDay(nextDueOn);
}
