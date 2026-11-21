import { addDays, daysBetween, weekdayOf } from "./schedule";

export type HabitGroup = "body" | "mind" | "connection";

export const HABIT_GROUPS: { key: HabitGroup; label: string }[] = [
  { key: "body", label: "Body" },
  { key: "mind", label: "Mind" },
  { key: "connection", label: "Connection" },
];

/** The daily habits. Keys are stored in HabitLog, so never rename one (labels are free to change). */
export const HABITS = [
  { key: "sleep", group: "body", label: "Sleep 7–9 hours", hint: "Same bedtime daily" },
  { key: "move", group: "body", label: "Move 30+ minutes", hint: "Or ~8,000 steps" },
  { key: "fruit-veg", group: "body", label: "5 portions fruit and veg", hint: "2 fruit, 3 veg" },
  { key: "water", group: "body", label: "Drink enough water", hint: "About 6–8 glasses" },
  { key: "daylight", group: "mind", label: "Morning daylight", hint: "10–20 minutes outside" },
  { key: "calm", group: "mind", label: "10 minutes of calm", hint: "Breathe, meditate, walk" },
  { key: "good-things", group: "mind", label: "Write 3 good things", hint: "Before bed" },
  { key: "learn", group: "mind", label: "Learn or create", hint: "Read, hobby, skill" },
  { key: "conversation", group: "connection", label: "One real conversation", hint: "Friend, family, partner" },
  { key: "kindness", group: "connection", label: "One act of kindness", hint: "Small counts" },
  { key: "social-media", group: "connection", label: "Social media under 30 min", hint: "Phone out of bedroom" },
] as const satisfies readonly { key: string; group: HabitGroup; label: string; hint: string }[];

export type HabitKey = (typeof HABITS)[number]["key"];
export type Habit = (typeof HABITS)[number];

export function isHabitKey(key: unknown): key is HabitKey {
  return HABITS.some((h) => h.key === key);
}

export type HabitLogRow = { habit: string; doneOn: string };

export type HabitStat = { habit: Habit; done: number; days: number; rate: number };

/**
 * Share of days each habit was done over the last `days` days (today included), never before `since`
 * (the day habits were turned on). A day without a tick counts as a miss. Hardest (lowest rate) first.
 */
export function habitStats(logs: HabitLogRow[], todayKey: string, since: string, days = 30): HabitStat[] {
  const windowStart = addDays(todayKey, -(days - 1));
  const from = since > windowStart ? since : windowStart;
  const span = Math.max(1, daysBetween(from, todayKey) + 1);
  return HABITS.map((habit) => {
    const done = new Set(logs.filter((l) => l.habit === habit.key && l.doneOn >= from && l.doneOn <= todayKey).map((l) => l.doneOn)).size;
    return { habit, done, days: span, rate: done / span };
  }).sort((a, b) => a.rate - b.rate);
}

/** Day keys from the Monday `weeks` − 1 weeks back up to today, and per habit whether it was done on each. */
export function habitGrid(logs: HabitLogRow[], todayKey: string, weeks = 4): { keys: string[]; rows: { habit: Habit; done: boolean[] }[] } {
  const start = addDays(todayKey, -((weekdayOf(todayKey) + 6) % 7) - 7 * (weeks - 1));
  const keys = Array.from({ length: daysBetween(start, todayKey) + 1 }, (_, i) => addDays(start, i));
  const done = new Set(logs.map((l) => `${l.habit}|${l.doneOn}`));
  return { keys, rows: HABITS.map((habit) => ({ habit, done: keys.map((k) => done.has(`${habit.key}|${k}`)) })) };
}
