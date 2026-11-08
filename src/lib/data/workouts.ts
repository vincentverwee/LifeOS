import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { dayKey } from "@/lib/format";
import { getTimeZone } from "@/lib/today";
import { addDays } from "@/lib/reminders/schedule";
import { CATEGORY_COLOR_SLOTS } from "@/lib/categoryPalette";
import { lastSetsFor, streakWeeks, totals, weekProgress, type SetLite, type Totals, type WeekProgress, type WorkoutLite } from "@/lib/workouts/stats";
import { timeOfDayIn } from "@/lib/workouts/time";
import type { WeighIn } from "@/lib/workouts/weight";
import {
  DEFAULT_ACTIVITIES,
  DEFAULT_EXERCISES,
  isActivityKind,
  isMeasure,
  type Activity,
  type ActivityKind,
  type ActivityRef,
  type ExerciseRow,
  type LiveWorkout,
  type Measure,
  type TemplateView,
  type WorkoutView,
} from "@/lib/workouts/types";

const utc = (key: string) => new Date(`${key}T00:00:00Z`);
const kindOf = (k: string): ActivityKind => (isActivityKind(k) ? k : "cardio");
const measureOf = (m: string): Measure => (isMeasure(m) ? m : "reps");
const num = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));

/** Only finished sessions count anywhere but the live screen. */
export const FINISHED = { endedAt: { not: null } } satisfies Prisma.WorkoutWhereInput;

const ACTIVITY_REF = { select: { id: true, name: true, kind: true, color: true } } as const;
const toRef = (a: { id: string; name: string; kind: string; color: string }): ActivityRef => ({ ...a, kind: kindOf(a.kind) });

/* ---------- activities and exercises ---------- */

/** Every activity (archived last), creating the defaults the first time. */
export async function getActivities(): Promise<Activity[]> {
  const load = () =>
    prisma.workoutActivity.findMany({
      orderBy: [{ isArchived: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, kind: true, color: true, sortOrder: true, isArchived: true, _count: { select: { workouts: true } } },
    });
  let rows = await load();
  if (rows.length === 0) {
    await prisma.workoutActivity.createMany({
      data: DEFAULT_ACTIVITIES.map((a, i) => ({ ...a, sortOrder: i, color: CATEGORY_COLOR_SLOTS[i % CATEGORY_COLOR_SLOTS.length] })),
      skipDuplicates: true,
    });
    rows = await load();
  }
  return rows.map(({ _count, ...a }) => ({ ...a, kind: kindOf(a.kind), workoutCount: _count.workouts }));
}

/** Every exercise A–Z (archived last), creating the defaults the first time. */
export async function getExercises(): Promise<ExerciseRow[]> {
  const load = () =>
    prisma.exercise.findMany({
      orderBy: [{ isArchived: "asc" }, { name: "asc" }],
      select: { id: true, name: true, measure: true, isArchived: true, _count: { select: { sets: true } } },
    });
  let rows = await load();
  if (rows.length === 0) {
    await prisma.exercise.createMany({ data: DEFAULT_EXERCISES, skipDuplicates: true });
    rows = await load();
  }
  return rows.map(({ _count, ...e }) => ({ ...e, measure: measureOf(e.measure), setCount: _count.sets }));
}

/* ---------- workouts ---------- */

const WORKOUT_SELECT = {
  id: true,
  date: true,
  startedAt: true,
  endedAt: true,
  durationMin: true,
  distanceKm: true,
  effort: true,
  feel: true,
  place: true,
  note: true,
  templateId: true,
  template: { select: { name: true } },
  activity: ACTIVITY_REF,
  sets: {
    orderBy: { position: "asc" },
    select: { id: true, exerciseId: true, position: true, reps: true, seconds: true, done: true, exercise: { select: { name: true, measure: true } } },
  },
  people: { orderBy: { person: { name: "asc" } }, select: { person: { select: { id: true, name: true } } } },
} satisfies Prisma.WorkoutSelect;

type WorkoutRow = Prisma.WorkoutGetPayload<{ select: typeof WORKOUT_SELECT }>;

function toView(row: WorkoutRow, tz: string): WorkoutView {
  return {
    id: row.id,
    date: dayKey(row.date),
    startedAt: row.startedAt.toISOString(),
    time: timeOfDayIn(row.startedAt, tz),
    endedAt: row.endedAt?.toISOString() ?? null,
    durationMin: row.durationMin,
    distanceKm: num(row.distanceKm),
    effort: row.effort,
    feel: row.feel,
    place: row.place,
    note: row.note,
    templateId: row.templateId,
    templateName: row.template?.name ?? null,
    activity: toRef(row.activity),
    sets: row.sets.map(({ exercise, ...s }) => ({ ...s, exerciseName: exercise.name, measure: measureOf(exercise.measure) })),
    people: row.people.map((p) => p.person),
  };
}

/** Finished workouts, newest first: an optional date range, activity, and a page size. */
export async function getWorkouts(opts: { from?: string; to?: string; activityId?: string; take?: number } = {}): Promise<WorkoutView[]> {
  const [rows, tz] = await Promise.all([
    prisma.workout.findMany({
      where: {
        ...FINISHED,
        ...(opts.activityId ? { activityId: opts.activityId } : {}),
        ...(opts.from || opts.to ? { date: { ...(opts.from ? { gte: utc(opts.from) } : {}), ...(opts.to ? { lte: utc(opts.to) } : {}) } } : {}),
      },
      orderBy: [{ date: "desc" }, { startedAt: "desc" }],
      take: opts.take,
      select: WORKOUT_SELECT,
    }),
    getTimeZone(),
  ]);
  return rows.map((r) => toView(r, tz));
}

export async function getWorkout(id: string): Promise<WorkoutView | null> {
  const [row, tz] = await Promise.all([prisma.workout.findUnique({ where: { id }, select: WORKOUT_SELECT }), getTimeZone()]);
  return row ? toView(row, tz) : null;
}

/** The running session, if any. */
async function loadLiveWorkout(): Promise<LiveWorkout | null> {
  const live = await prisma.workoutLive.findUnique({ where: { id: "current" }, select: { restUntil: true, workout: { select: WORKOUT_SELECT } } });
  if (!live) return null;
  return { workout: toView(live.workout, await getTimeZone()), restUntil: live.restUntil?.toISOString() ?? null };
}
export const getLiveWorkout = cache(loadLiveWorkout);

/** Light rows for the stats (finished only), optionally from a day on. */
async function loadWorkoutLites(from?: string): Promise<WorkoutLite[]> {
  const rows = await prisma.workout.findMany({
    where: { ...FINISHED, ...(from ? { date: { gte: utc(from) } } : {}) },
    orderBy: [{ date: "asc" }, { startedAt: "asc" }],
    select: { id: true, date: true, durationMin: true, distanceKm: true, activity: ACTIVITY_REF },
  });
  return rows.map((r) => ({
    id: r.id,
    date: dayKey(r.date),
    durationMin: r.durationMin ?? 0,
    distanceKm: num(r.distanceKm),
    activityId: r.activity.id,
    activityName: r.activity.name,
    kind: kindOf(r.activity.kind),
  }));
}
export const getWorkoutLites = cache(loadWorkoutLites);

/** Every finished set as a value (reps or seconds), for bests and prefills. */
export async function getSetLites(): Promise<(SetLite & { position: number })[]> {
  const rows = await prisma.workoutSet.findMany({
    where: { workout: FINISHED },
    select: {
      workoutId: true,
      position: true,
      reps: true,
      seconds: true,
      exercise: { select: { id: true, name: true, measure: true } },
      workout: { select: { date: true } },
    },
  });
  return rows.map((r) => ({
    workoutId: r.workoutId,
    date: dayKey(r.workout.date),
    position: r.position,
    exerciseId: r.exercise.id,
    exerciseName: r.exercise.name,
    measure: measureOf(r.exercise.measure),
    value: r.seconds ?? r.reps ?? 0,
  }));
}

/** Last time's sets per exercise (from the newest finished workout that had it), to prefill forms. */
export async function getLastSets(): Promise<Record<string, number[]>> {
  const sets = await getSetLites();
  const ids = [...new Set(sets.map((s) => s.exerciseId))];
  return Object.fromEntries(ids.map((id) => [id, lastSetsFor(sets, id)]));
}

/** Places used before, most used first (the form's suggestions). */
export async function getPlaces(): Promise<string[]> {
  const rows = await prisma.workout.groupBy({
    by: ["place"],
    where: { place: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { place: "desc" } },
    take: 12,
  });
  return rows.flatMap((r) => (r.place ? [r.place] : []));
}

/* ---------- templates, goal, weight ---------- */

const TEMPLATE_SELECT = {
  id: true,
  name: true,
  note: true,
  activity: ACTIVITY_REF,
  exercises: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      exerciseId: true,
      position: true,
      sets: true,
      target: true,
      restSeconds: true,
      exercise: { select: { name: true, measure: true } },
    },
  },
} satisfies Prisma.WorkoutTemplateSelect;

function toTemplate(t: Prisma.WorkoutTemplateGetPayload<{ select: typeof TEMPLATE_SELECT }>): TemplateView {
  return {
    id: t.id,
    name: t.name,
    note: t.note,
    activity: toRef(t.activity),
    exercises: t.exercises.map(({ exercise, ...e }) => ({ ...e, exerciseName: exercise.name, measure: measureOf(exercise.measure) })),
  };
}

export async function getTemplates(): Promise<TemplateView[]> {
  const rows = await prisma.workoutTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: TEMPLATE_SELECT });
  return rows.map(toTemplate);
}

export async function getTemplate(id: string): Promise<TemplateView | null> {
  const row = await prisma.workoutTemplate.findUnique({ where: { id }, select: TEMPLATE_SELECT });
  return row ? toTemplate(row) : null;
}

async function loadGoal(): Promise<number | null> {
  return (await prisma.workoutGoal.findUnique({ where: { id: "current" }, select: { perWeek: true } }))?.perWeek ?? null;
}
export const getGoal = cache(loadGoal);

/** Every weigh-in, oldest first. */
export async function getBodyWeights(): Promise<WeighIn[]> {
  const rows = await prisma.bodyWeight.findMany({ orderBy: { date: "asc" }, select: { date: true, kg: true } });
  return rows.map((r) => ({ date: dayKey(r.date), kg: Number(r.kg) }));
}

/* ---------- Home ---------- */

export type WorkoutsGlance = {
  week: WeekProgress;
  streak: number;
  /** This week's finished sessions added up (shown on the tile when there's no goal). */
  weekTotals: Totals;
  /** The newest finished workout in the last year, or null. */
  last: { activityName: string; date: string; durationMin: number; distanceKm: number | null } | null;
  live: { activityName: string; startedAt: string } | null;
};

/** The Home tile and the coach's mood: this week vs the goal, the streak, the last workout. Cached per request. */
async function loadWorkoutsGlance(todayKey: string): Promise<WorkoutsGlance> {
  // A year back is plenty for a streak; the tile needs nothing older.
  const [lites, goal, live] = await Promise.all([
    getWorkoutLites(addDays(todayKey, -371)),
    getGoal(),
    prisma.workoutLive.findUnique({
      where: { id: "current" },
      select: { workout: { select: { startedAt: true, activity: { select: { name: true } } } } },
    }),
  ]);
  const upToToday = lites.filter((w) => w.date <= todayKey);
  const newest = upToToday.at(-1);
  const week = weekProgress(upToToday, goal, todayKey);
  return {
    week,
    streak: streakWeeks(upToToday, goal, todayKey),
    weekTotals: totals(upToToday.filter((w) => w.date >= week.monday)),
    last: newest ? { activityName: newest.activityName, date: newest.date, durationMin: newest.durationMin, distanceKm: newest.distanceKm } : null,
    live: live ? { activityName: live.workout.activity.name, startedAt: live.workout.startedAt.toISOString() } : null,
  };
}
export const getWorkoutsGlance = cache(loadWorkoutsGlance);
