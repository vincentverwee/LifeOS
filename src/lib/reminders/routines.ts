// Pure "last done" math on "YYYY-MM-DD" keys.
import { daysBetween } from "./schedule";

export type Routine = {
  id: string;
  name: string;
  everyDays: number | null;
  /** "YYYY-MM-DD", null = never done */
  lastDoneOn: string | null;
  /** Latest logs first ("YYYY-MM-DD"), at most a handful. */
  recent: string[];
};

export function daysSince(lastDoneOn: string | null, todayKey: string): number | null {
  return lastDoneOn === null ? null : daysBetween(lastDoneOn, todayKey);
}

/** Has a nudge and it's been at least that long (or never done). */
export function isDue(routine: Pick<Routine, "everyDays" | "lastDoneOn">, todayKey: string): boolean {
  if (routine.everyDays === null) return false;
  const days = daysSince(routine.lastDoneOn, todayKey);
  return days === null || days >= routine.everyDays;
}

/** Past its nudge (not just due today). */
export function isOverdue(routine: Pick<Routine, "everyDays" | "lastDoneOn">, todayKey: string): boolean {
  if (routine.everyDays === null) return false;
  const days = daysSince(routine.lastDoneOn, todayKey);
  return days === null || days > routine.everyDays;
}

/** "Today" / "Yesterday" / "14 days ago" / "Never" */
export function describeSince(lastDoneOn: string | null, todayKey: string): string {
  const days = daysSince(lastDoneOn, todayKey);
  if (days === null) return "Never";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** Average gap in days between the given logs (latest first), or null with fewer than two. */
export function averageInterval(doneOns: string[]): number | null {
  const logs = doneOns.slice(0, 6);
  if (logs.length < 2) return null;
  return Math.round(daysBetween(logs[logs.length - 1], logs[0]) / (logs.length - 1));
}

/** "every 14 d" / "usually every ~9 d" / null */
export function describeRhythm(routine: Pick<Routine, "everyDays" | "recent">): string | null {
  if (routine.everyDays !== null) return `every ${routine.everyDays} d`;
  const average = averageInterval(routine.recent);
  return average ? `usually every ~${average} d` : null;
}

/** Due first, then longest ago (never done counts as longest). */
export function compareRoutines(todayKey: string) {
  return (a: Routine, b: Routine) => {
    const due = Number(isDue(b, todayKey)) - Number(isDue(a, todayKey));
    if (due !== 0) return due;
    const days = (r: Routine) => daysSince(r.lastDoneOn, todayKey) ?? Number.POSITIVE_INFINITY;
    return days(b) - days(a) || a.name.localeCompare(b.name);
  };
}
