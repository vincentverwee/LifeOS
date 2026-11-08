// Workouts: kinds, labels, defaults and limits (pure, shared by server and client).

export const ACTIVITY_KINDS = ["cardio", "sport", "bodyweight"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  cardio: "Cardio",
  sport: "Sport / class",
  bodyweight: "Bodyweight",
};

export function isActivityKind(value: unknown): value is ActivityKind {
  return (ACTIVITY_KINDS as readonly string[]).includes(value as string);
}

export const MEASURES = ["reps", "time"] as const;
export type Measure = (typeof MEASURES)[number];

export function isMeasure(value: unknown): value is Measure {
  return (MEASURES as readonly string[]).includes(value as string);
}

/** Created once, when there are no activities yet (Settings manages them after that). */
export const DEFAULT_ACTIVITIES: { name: string; kind: ActivityKind }[] = [
  { name: "Running", kind: "cardio" },
  { name: "Walking", kind: "cardio" },
  { name: "Cycling", kind: "cardio" },
  { name: "Swimming", kind: "cardio" },
  { name: "Home workout", kind: "bodyweight" },
  { name: "Football", kind: "sport" },
  { name: "Yoga", kind: "sport" },
  { name: "Climbing", kind: "sport" },
];

/** Created once, when there are no exercises yet. */
export const DEFAULT_EXERCISES: { name: string; measure: Measure }[] = [
  { name: "Push-ups", measure: "reps" },
  { name: "Squats", measure: "reps" },
  { name: "Lunges", measure: "reps" },
  { name: "Sit-ups", measure: "reps" },
  { name: "Burpees", measure: "reps" },
  { name: "Pull-ups", measure: "reps" },
  { name: "Plank", measure: "time" },
  { name: "Wall sit", measure: "time" },
];

/** How hard it was (Workout.effort). */
export const EFFORTS = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Steady" },
  { value: 3, label: "Hard" },
  { value: 4, label: "Very hard" },
  { value: 5, label: "All out" },
] as const;

export function effortLabel(value: number | null | undefined): string | null {
  return EFFORTS.find((e) => e.value === value)?.label ?? null;
}

export function isScale(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export const LIMITS = {
  name: 40,
  place: 60,
  note: 500,
  durationMin: 1440,
  distanceKm: 1000,
  reps: 1000,
  seconds: 7200,
  sets: 10,
  rest: 600,
  goal: 14,
  minKg: 20,
  maxKg: 300,
} as const;

export const DEFAULT_REST_SECONDS = 60;
/** A live session past this is "forgotten" (push nudge, like the study timer). */
export const FORGOTTEN_HOURS = 3;

/** "1:05" for seconds, "45 s" under a minute. */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "45 min", "1 h 20". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

const kmFormatter = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 2 });

/** "5,2 km" */
export function formatKm(km: number): string {
  return `${kmFormatter.format(km)} km`;
}

/** A set as text: "12" reps or "0:45" held. */
export function formatSet(set: { reps: number | null; seconds: number | null }): string {
  return set.seconds !== null ? formatSeconds(set.seconds) : String(set.reps ?? 0);
}

/* ---------- what pages get (plain, serialisable) ---------- */

export type ActivityRef = { id: string; name: string; kind: ActivityKind; color: string };
export type Activity = ActivityRef & { sortOrder: number; isArchived: boolean; workoutCount: number };
export type ExerciseRow = { id: string; name: string; measure: Measure; isArchived: boolean; setCount: number };

export type WorkoutSetView = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  measure: Measure;
  position: number;
  reps: number | null;
  seconds: number | null;
  done: boolean;
};

export type WorkoutView = {
  id: string;
  /** "YYYY-MM-DD", the local day it started. */
  date: string;
  startedAt: string;
  /** "HH:MM" local. */
  time: string;
  endedAt: string | null;
  durationMin: number | null;
  distanceKm: number | null;
  effort: number | null;
  feel: number | null;
  place: string | null;
  note: string | null;
  templateId: string | null;
  templateName: string | null;
  activity: ActivityRef;
  sets: WorkoutSetView[];
  people: { id: string; name: string }[];
};

export type TemplateExerciseView = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  measure: Measure;
  position: number;
  sets: number;
  target: number;
  restSeconds: number;
};

export type TemplateView = {
  id: string;
  name: string;
  note: string | null;
  activity: ActivityRef;
  exercises: TemplateExerciseView[];
};

export type LiveWorkout = { workout: WorkoutView; restUntil: string | null };

/** A set's sets grouped per exercise, in the order they first appear. */
export function groupSets<T extends { exerciseId: string; position: number }>(sets: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const s of [...sets].sort((a, b) => a.position - b.position)) groups.set(s.exerciseId, [...(groups.get(s.exerciseId) ?? []), s]);
  return [...groups.values()];
}
