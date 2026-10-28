// The push notifications a device can switch on. Times are in the device's own
// timezone; the scheduler (src/lib/push/schedule.ts) runs every 15 minutes and
// sends each one once, inside its window, only when there's something to say.

export const PUSH_KINDS = [
  {
    key: "digest",
    label: "Morning to-do",
    description: "8:00, every day · the weather (if a location is set), open reminders, Last done items that are due, subscriptions to log or renewing tomorrow, exams in 7/3/1 days, rent tomorrow.",
  },
  {
    key: "timer",
    label: "Forgotten study timer",
    description: "When a study timer has been running for 3 hours.",
  },
  {
    key: "study-evening",
    label: "Study goal",
    description: "20:00 · if today's study time is under your daily goal.",
  },
  {
    key: "budget-evening",
    label: "Expenses",
    description: "21:00 · if nothing was logged today, or you're over today's budget.",
  },
  {
    key: "week",
    label: "Sunday review",
    description: "19:00, Sundays · this week's spending vs its share of the budget, study hours vs goal, Last done items done and due, subscriptions logged.",
  },
] as const;

export type PushKind = (typeof PUSH_KINDS)[number]["key"];

export const ALL_PUSH_KINDS: PushKind[] = PUSH_KINDS.map((k) => k.key);

export function isPushKind(value: unknown): value is PushKind {
  return typeof value === "string" && (ALL_PUSH_KINDS as string[]).includes(value);
}

export type PushPayload = { title: string; body: string; url: string; tag: string };
