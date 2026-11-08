// Pure workout math on "YYYY-MM-DD" keys: the week vs the goal, streaks, totals, pace, bests.
import { addDays, daysBetween } from "@/lib/reminders/schedule";
import { mondayOf } from "@/lib/lessons/stats";
import type { ActivityKind, Measure } from "./types";

export type WorkoutLite = {
  id: string;
  date: string;
  durationMin: number;
  distanceKm: number | null;
  activityId: string;
  activityName: string;
  kind: ActivityKind;
};

/* ---------- this week vs the goal ---------- */

export type WeekProgress = {
  monday: string;
  /** Mon–Sun, sessions per day. */
  days: { date: string; count: number }[];
  done: number;
  /** null = no goal set. */
  goal: number | null;
  /** Sessions still to do (0 once met). */
  left: number;
  /** Days left this week, today included. */
  daysLeft: number;
  met: boolean;
  /** Needs a session on every day still open (or more than that). */
  behind: boolean;
  /** Still possible at one session a day. */
  reachable: boolean;
  todayDone: boolean;
};

export function weekProgress(workouts: Pick<WorkoutLite, "date">[], goal: number | null, todayKey: string): WeekProgress {
  const monday = mondayOf(todayKey);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, count: workouts.filter((w) => w.date === date).length };
  });
  const done = days.reduce((n, d) => n + d.count, 0);
  const todayDone = days.some((d) => d.date === todayKey && d.count > 0);
  const daysLeft = 7 - daysBetween(monday, todayKey);
  const left = goal === null ? 0 : Math.max(0, goal - done);
  // Days still open for a session: today only counts while nothing was done today.
  const openDays = daysLeft - (todayDone ? 1 : 0);
  return { monday, days, done, goal, left, daysLeft, met: goal !== null && done >= goal, behind: left > 0 && left >= openDays, reachable: left <= openDays, todayDone };
}

/** Weeks in a row that met the goal, counting back from last week; the running week adds one once it's met. */
export function streakWeeks(workouts: Pick<WorkoutLite, "date">[], goal: number | null, todayKey: string): number {
  if (goal === null) return 0;
  const perWeek = new Map<string, number>();
  for (const w of workouts) perWeek.set(mondayOf(w.date), (perWeek.get(mondayOf(w.date)) ?? 0) + 1);
  const thisMonday = mondayOf(todayKey);
  let streak = (perWeek.get(thisMonday) ?? 0) >= goal ? 1 : 0;
  for (let monday = addDays(thisMonday, -7); (perWeek.get(monday) ?? 0) >= goal; monday = addDays(monday, -7)) streak++;
  return streak;
}

/* ---------- totals ---------- */

export type Totals = { sessions: number; minutes: number; km: number };

export function totals(workouts: Pick<WorkoutLite, "durationMin" | "distanceKm">[]): Totals {
  return {
    sessions: workouts.length,
    minutes: workouts.reduce((n, w) => n + w.durationMin, 0),
    km: round2(workouts.reduce((n, w) => n + (w.distanceKm ?? 0), 0)),
  };
}

/** The last `weeks` Mon–Sun weeks up to this one, oldest first. */
export function weeklyTotals(workouts: WorkoutLite[], todayKey: string, weeks = 12): ({ monday: string } & Totals)[] {
  const thisMonday = mondayOf(todayKey);
  return Array.from({ length: weeks }, (_, i) => {
    const monday = addDays(thisMonday, -7 * (weeks - 1 - i));
    const end = addDays(monday, 6);
    return { monday, ...totals(workouts.filter((w) => w.date >= monday && w.date <= end)) };
  });
}

/** Per activity, most sessions first. */
export function byActivity(workouts: WorkoutLite[]): ({ activityId: string; name: string; kind: ActivityKind } & Totals)[] {
  const groups = new Map<string, WorkoutLite[]>();
  for (const w of workouts) groups.set(w.activityId, [...(groups.get(w.activityId) ?? []), w]);
  return [...groups.values()]
    .map((ws) => ({ activityId: ws[0].activityId, name: ws[0].activityName, kind: ws[0].kind, ...totals(ws) }))
    .sort((a, b) => b.sessions - a.sessions || b.minutes - a.minutes || a.name.localeCompare(b.name));
}

/** Sessions per weekday, Monday first. */
export function byWeekday(workouts: Pick<WorkoutLite, "date">[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const w of workouts) counts[(new Date(`${w.date}T00:00:00Z`).getUTCDay() + 6) % 7]++;
  return counts;
}

/** This month so far vs the same number of days of last month. */
export function monthToDate(workouts: WorkoutLite[], todayKey: string): { thisMonth: Totals; lastMonth: Totals } {
  const first = `${todayKey.slice(0, 7)}-01`;
  const day = daysBetween(first, todayKey);
  const lastFirst = addDays(first, -1).slice(0, 7) + "-01";
  // Clamp to last month's length (31 Mar → 28/29 Feb).
  const lastEndFull = addDays(first, -1);
  const lastEnd = addDays(lastFirst, day) < lastEndFull ? addDays(lastFirst, day) : lastEndFull;
  return {
    thisMonth: totals(workouts.filter((w) => w.date >= first && w.date <= todayKey)),
    lastMonth: totals(workouts.filter((w) => w.date >= lastFirst && w.date <= lastEnd)),
  };
}

/* ---------- pace ---------- */

/** Minutes per km, or null without both. */
export function pace(distanceKm: number | null, minutes: number): number | null {
  return distanceKm && distanceKm > 0 && minutes > 0 ? minutes / distanceKm : null;
}

/** "5:12 /km" */
export function formatPace(minPerKm: number): string {
  let m = Math.floor(minPerKm);
  let s = Math.round((minPerKm - m) * 60);
  if (s === 60) {
    m++;
    s = 0;
  }
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

/** "24,5 km/h" (cycling reads better as speed). */
export function formatSpeed(distanceKm: number, minutes: number): string {
  return `${new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 1 }).format((distanceKm / minutes) * 60)} km/h`;
}

/** Speed for cycling, pace for everything else. */
export function describeTempo(activityName: string, distanceKm: number | null, minutes: number): string | null {
  const p = pace(distanceKm, minutes);
  if (p === null || distanceKm === null) return null;
  return /cycl|bike|fiets/i.test(activityName) ? formatSpeed(distanceKm, minutes) : formatPace(p);
}

/* ---------- exercises ---------- */

export type SetLite = {
  workoutId: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  measure: Measure;
  /** reps or seconds, whichever the exercise measures. */
  value: number;
};

export type ExerciseBest = {
  exerciseId: string;
  name: string;
  measure: Measure;
  /** Most reps / longest hold in one set, and when. */
  bestSet: number;
  bestSetOn: string;
  /** Most in one session (all sets added up). */
  bestSession: number;
  sessions: number;
  lastOn: string;
  /** Per session: the best set, oldest first (the progress line). */
  history: { date: string; best: number }[];
};

export function exerciseBests(sets: SetLite[]): ExerciseBest[] {
  const byExercise = new Map<string, SetLite[]>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  return [...byExercise.values()]
    .map((list) => {
      const sessions = new Map<string, { date: string; best: number; total: number }>();
      for (const s of list) {
        const cur = sessions.get(s.workoutId) ?? { date: s.date, best: 0, total: 0 };
        sessions.set(s.workoutId, { date: s.date, best: Math.max(cur.best, s.value), total: cur.total + s.value });
      }
      const history = [...sessions.values()].sort((a, b) => a.date.localeCompare(b.date));
      // The earliest set that reached the best counts as the record.
      const best = [...list].sort((a, b) => b.value - a.value || a.date.localeCompare(b.date))[0];
      return {
        exerciseId: best.exerciseId,
        name: best.exerciseName,
        measure: best.measure,
        bestSet: best.value,
        bestSetOn: best.date,
        bestSession: Math.max(...history.map((h) => h.total)),
        sessions: history.length,
        lastOn: history[history.length - 1].date,
        history: history.map(({ date, best: b }) => ({ date, best: b })),
      };
    })
    .sort((a, b) => b.lastOn.localeCompare(a.lastOn) || a.name.localeCompare(b.name));
}

/** The sets of an exercise from the newest earlier workout that had it (to prefill), in order. */
export function lastSetsFor(
  sets: (Pick<SetLite, "workoutId" | "date" | "exerciseId" | "value"> & { position: number })[],
  exerciseId: string,
  excludeWorkoutId?: string,
): number[] {
  const mine = sets.filter((s) => s.exerciseId === exerciseId && s.workoutId !== excludeWorkoutId);
  if (mine.length === 0) return [];
  const newest = [...mine].sort((a, b) => b.date.localeCompare(a.date))[0].workoutId;
  return mine.filter((s) => s.workoutId === newest).sort((a, b) => a.position - b.position).map((s) => s.value);
}

/** A set counts as a record when it beats every earlier set of that exercise. */
export function isRecord(value: number, earlierBest: number | null): boolean {
  return earlierBest !== null && value > earlierBest;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
