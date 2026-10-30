// The push notifications a device can switch on. Times are in the device's own
// timezone and can be changed per device (`PushSubscription.times`); the
// scheduler (src/lib/push/schedule.ts) runs every 15 minutes and sends each one
// once, on its first run from that time on, only when there's something to say.

export const PUSH_KINDS = [
  {
    key: "digest",
    label: "Morning to-do",
    time: "08:00",
    description: "Every day · the weather (if a location is set), open reminders, Last done items that are due, subscriptions to log or renewing tomorrow, exams in 7/3/1 days, rent tomorrow, birthdays in 7/1 days and today, people to catch up with.",
  },
  {
    key: "timer",
    label: "Forgotten study timer",
    description: "When a study timer has been running for 3 hours.",
  },
  {
    key: "study-evening",
    label: "Study goal",
    time: "20:00",
    description: "If today's study time is under your daily goal.",
  },
  {
    key: "budget-evening",
    label: "Expenses",
    time: "21:00",
    description: "If nothing was logged today, or you're over today's budget.",
  },
  {
    key: "week",
    label: "Sunday review",
    time: "19:00",
    description: "Sundays · this week's spending vs its share of the budget, study hours vs goal, Last done items done and due, subscriptions logged.",
  },
] as const;

export type PushKind = (typeof PUSH_KINDS)[number]["key"];

export const ALL_PUSH_KINDS: PushKind[] = PUSH_KINDS.map((k) => k.key);

export function isPushKind(value: unknown): value is PushKind {
  return typeof value === "string" && (ALL_PUSH_KINDS as string[]).includes(value);
}

/** Kinds sent at a time of day (all but the timer nudge). */
export type TimedPushKind = Exclude<PushKind, "timer">;

export function isTimedPushKind(value: unknown): value is TimedPushKind {
  return isPushKind(value) && value !== "timer";
}

/** A device's chosen times ("HH:MM" per kind); missing kinds use the default. */
export type PushTimes = Partial<Record<TimedPushKind, string>>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isPushTime(value: unknown): value is string {
  return typeof value === "string" && TIME.test(value);
}

/** The stored times, keeping only valid entries (the column is plain JSON). */
export function parsePushTimes(value: unknown): PushTimes {
  const times: PushTimes = {};
  if (value && typeof value === "object") {
    for (const [kind, time] of Object.entries(value)) {
      if (isTimedPushKind(kind) && isPushTime(time)) times[kind] = time;
    }
  }
  return times;
}

export function defaultPushTime(kind: TimedPushKind): string {
  const k = PUSH_KINDS.find((k) => k.key === kind);
  return k && "time" in k ? k.time : "08:00";
}

/** Minutes after midnight for an "HH:MM". */
export function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

export type PushPayload = { title: string; body: string; url: string; tag: string };
