// The push notifications a device can switch on. Times are in the device's own
// timezone; the scheduler (src/lib/push/schedule.ts) runs every 15 minutes and
// sends each one once, inside its window, only when there's something to say.

export const PUSH_KINDS = [
  {
    key: "digest",
    label: "Morning to-do",
    description: "8:00 · open reminders, Last done items that are due, exams in 7/3/1 days, rent tomorrow.",
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
] as const;

export type PushKind = (typeof PUSH_KINDS)[number]["key"];

export const ALL_PUSH_KINDS: PushKind[] = PUSH_KINDS.map((k) => k.key);

export function isPushKind(value: unknown): value is PushKind {
  return typeof value === "string" && (ALL_PUSH_KINDS as string[]).includes(value);
}

export type PushPayload = { title: string; body: string; url: string; tag: string };
