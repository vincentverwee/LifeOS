"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { knownError } from "@/lib/prismaErrors";
import { parseDateKey, dayKey } from "@/lib/format";
import { getTimeZone, getTodayKey } from "@/lib/today";
import { CATEGORY_COLOR_SLOTS } from "@/lib/categoryPalette";
import { lastSetsFor } from "@/lib/workouts/stats";
import { parseTime, zonedInstant } from "@/lib/workouts/time";
import { FINISHED } from "@/lib/data/workouts";
import { DEFAULT_REST_SECONDS, isActivityKind, isMeasure, isScale, LIMITS, type Measure } from "@/lib/workouts/types";

export type WorkoutResult = { ok: true } | { ok: false; error: string };
export type WorkoutFormState = { ok: true; at: number; id: string } | { ok: false; error: string } | null;
export type SimpleFormState = { ok: true; at: number } | { ok: false; error: string } | null;

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/workouts", "layout");
  revalidatePath("/people", "layout");
}

const clean = (raw: unknown) => String(raw ?? "").replace(/\s+/g, " ").trim();

function optionalText(raw: unknown, max: number, what: string): { value: string | null } | { error: string } {
  const value = clean(raw);
  if (value.length > max) return { error: `Keep the ${what} to ${max} characters.` };
  return { value: value || null };
}

function optionalScale(raw: unknown, what: string): { value: number | null } | { error: string } {
  const s = String(raw ?? "");
  if (!s) return { value: null };
  const n = Number(s);
  return isScale(n) ? { value: n } : { error: `That ${what} isn't valid.` };
}

function optionalNumber(raw: unknown): number | null | undefined {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function wholeNumber(raw: unknown, min: number, max: number): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/** Sets from the form's JSON: [{ exerciseId, value }] in order, value = reps or seconds. */
async function readSets(raw: unknown): Promise<{ sets: { exerciseId: string; reps: number | null; seconds: number | null }[] } | { error: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw || "[]"));
  } catch {
    return { error: "Those sets couldn't be read." };
  }
  if (!Array.isArray(parsed) || parsed.length > 200) return { error: "Those sets couldn't be read." };
  const ids = [...new Set(parsed.map((s) => String((s as { exerciseId?: unknown }).exerciseId)))];
  const exercises = await prisma.exercise.findMany({ where: { id: { in: ids } }, select: { id: true, measure: true } });
  const measure = new Map(exercises.map((e) => [e.id, e.measure as Measure]));
  const sets = [];
  for (const s of parsed as { exerciseId?: unknown; value?: unknown }[]) {
    const m = measure.get(String(s.exerciseId));
    if (!m) return { error: "One of those exercises is gone. Reload and try again." };
    const value = wholeNumber(s.value, 1, m === "time" ? LIMITS.seconds : LIMITS.reps);
    if (value === null) return { error: m === "time" ? "A hold is 1 s to 2 h." : "Reps are 1 to 1000." };
    sets.push({ exerciseId: String(s.exerciseId), reps: m === "reps" ? value : null, seconds: m === "time" ? value : null });
  }
  return { sets };
}

/** Person ids from the form (repeated "people" fields), only ones that exist. */
async function readPeople(formData: FormData): Promise<string[]> {
  const ids = [...new Set(formData.getAll("people").map(String).filter(Boolean))].slice(0, 50);
  if (ids.length === 0) return [];
  const found = await prisma.person.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return found.map((p) => p.id);
}

type Details = {
  effort: number | null;
  feel: number | null;
  place: string | null;
  note: string | null;
  distanceKm: number | null;
  people: string[];
};

/** The "how it went" fields shared by logging by hand and finishing a live session. */
async function readDetails(formData: FormData): Promise<Details | { error: string }> {
  const effort = optionalScale(formData.get("effort"), "effort");
  if ("error" in effort) return effort;
  const feel = optionalScale(formData.get("feel"), "feeling");
  if ("error" in feel) return feel;
  const place = optionalText(formData.get("place"), LIMITS.place, "place");
  if ("error" in place) return place;
  const noteRaw = String(formData.get("note") ?? "").trim();
  if (noteRaw.length > LIMITS.note) return { error: `Keep the note to ${LIMITS.note} characters.` };
  const distanceKm = optionalNumber(formData.get("distanceKm"));
  if (distanceKm === undefined || (distanceKm !== null && (distanceKm <= 0 || distanceKm > LIMITS.distanceKm)))
    return { error: "That distance isn't valid." };
  return {
    effort: effort.value,
    feel: feel.value,
    place: place.value,
    note: noteRaw || null,
    distanceKm: distanceKm === null ? null : Math.round(distanceKm * 100) / 100,
    people: await readPeople(formData),
  };
}

/* ---------- logging by hand ---------- */

/** Logs a finished workout by hand, or saves an edit of one (`id`). */
export async function saveWorkout(_prev: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "") || null;
  const activity = await prisma.workoutActivity.findUnique({ where: { id: String(formData.get("activityId") ?? "") }, select: { id: true, kind: true } });
  if (!activity) return { ok: false, error: "Pick what you did." };

  const date = parseDateKey(formData.get("date"));
  if (!date) return { ok: false, error: "That date isn't valid." };
  if (date > (await getTodayKey())) return { ok: false, error: "That day hasn't happened yet." };
  const time = parseTime(formData.get("time"));
  if (!time) return { ok: false, error: "That start time isn't valid." };
  const durationMin = wholeNumber(formData.get("durationMin"), 1, LIMITS.durationMin);
  if (durationMin === null) return { ok: false, error: "How long did it take? 1 minute to 24 hours." };

  const details = await readDetails(formData);
  if ("error" in details) return { ok: false, error: details.error };
  const s = activity.kind === "bodyweight" ? await readSets(formData.get("sets")) : { sets: [] };
  if ("error" in s) return { ok: false, error: s.error };

  const startedAt = zonedInstant(date, time, await getTimeZone());
  const data = {
    activityId: activity.id,
    date: utc(date),
    startedAt,
    endedAt: new Date(startedAt.getTime() + durationMin * 60_000),
    durationMin,
    distanceKm: activity.kind === "cardio" ? details.distanceKm : null,
    effort: details.effort,
    feel: details.feel,
    place: details.place,
    note: details.note,
  };
  const sets = s.sets.map((set, position) => ({ ...set, position, done: true }));
  const people = details.people.map((personId) => ({ personId }));

  try {
    const saved = await prisma.$transaction(async (tx) => {
      if (!id) return tx.workout.create({ data: { ...data, sets: { create: sets }, people: { create: people } }, select: { id: true } });
      const existing = await tx.workout.findUnique({ where: { id }, select: { endedAt: true } });
      if (!existing) return null;
      if (!existing.endedAt) throw new Error("live");
      await tx.workoutSet.deleteMany({ where: { workoutId: id } });
      await tx.workoutPerson.deleteMany({ where: { workoutId: id } });
      return tx.workout.update({ where: { id }, data: { ...data, sets: { create: sets }, people: { create: people } }, select: { id: true } });
    });
    if (!saved) return { ok: false, error: "That workout is gone." };
    revalidate();
    return { ok: true, at: Date.now(), id: saved.id };
  } catch (e) {
    if (e instanceof Error && e.message === "live") return { ok: false, error: "Finish that session first." };
    return knownError(e, { P2003: "Something in it was just deleted. Reload and try again." });
  }
}

export async function deleteWorkout(id: string): Promise<WorkoutResult> {
  await requireAuth();
  await prisma.workout.deleteMany({ where: { id } });
  revalidate();
  return { ok: true };
}

/* ---------- live session ---------- */

const DEFAULT_START: Record<Measure, number> = { reps: 10, time: 30 };

async function liveWorkoutId(): Promise<string | null> {
  return (await prisma.workoutLive.findUnique({ where: { id: "current" }, select: { workoutId: true } }))?.workoutId ?? null;
}

/** Last time's numbers for each exercise (from finished workouts), to prefill new sets. */
async function lastValues(exerciseIds: string[]): Promise<Map<string, number[]>> {
  if (exerciseIds.length === 0) return new Map();
  const rows = await prisma.workoutSet.findMany({
    where: { exerciseId: { in: exerciseIds }, workout: FINISHED },
    select: { workoutId: true, exerciseId: true, position: true, reps: true, seconds: true, workout: { select: { date: true, startedAt: true } } },
  });
  // Same-day workouts: the later start wins, so sort keys include the time.
  const lites = rows.map((r) => ({
    workoutId: r.workoutId,
    date: `${dayKey(r.workout.date)}T${r.workout.startedAt.toISOString()}`,
    exerciseId: r.exerciseId,
    position: r.position,
    value: r.seconds ?? r.reps ?? 0,
  }));
  return new Map(exerciseIds.map((id) => [id, lastSetsFor(lites, id)]));
}

/** Starts a session now (from a template: its exercises and sets, filled with last time's numbers). */
export async function startWorkout(input: { activityId: string; templateId?: string | null }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAuth();
  if (await liveWorkoutId()) return { ok: false, error: "A session is already running." };
  const activity = await prisma.workoutActivity.findUnique({ where: { id: input.activityId }, select: { id: true } });
  if (!activity) return { ok: false, error: "That activity is gone. Reload and try again." };
  const template = input.templateId
    ? await prisma.workoutTemplate.findUnique({
        where: { id: input.templateId },
        select: { id: true, exercises: { orderBy: { position: "asc" }, select: { exerciseId: true, sets: true, target: true } } },
      })
    : null;
  const last = await lastValues(template?.exercises.map((e) => e.exerciseId) ?? []);
  const measures = new Map(
    (await prisma.exercise.findMany({ where: { id: { in: template?.exercises.map((e) => e.exerciseId) ?? [] } }, select: { id: true, measure: true } })).map((e) => [e.id, e.measure]),
  );
  let position = 0;
  const sets = (template?.exercises ?? []).flatMap((e) =>
    Array.from({ length: e.sets }, (_, i) => {
      const value = last.get(e.exerciseId)?.[i] ?? last.get(e.exerciseId)?.at(-1) ?? e.target;
      const time = measures.get(e.exerciseId) === "time";
      return { exerciseId: e.exerciseId, position: position++, reps: time ? null : value, seconds: time ? value : null, done: false };
    }),
  );

  try {
    const now = new Date();
    const today = await getTodayKey();
    const workout = await prisma.$transaction(async (tx) => {
      const w = await tx.workout.create({
        data: { activityId: activity.id, templateId: template?.id ?? null, date: utc(today), startedAt: now, sets: { create: sets } },
        select: { id: true },
      });
      // The single "current" row: a second start (double tap, other device) fails here.
      await tx.workoutLive.create({ data: { id: "current", workoutId: w.id } });
      return w;
    });
    revalidate();
    return { ok: true, id: workout.id };
  } catch (e) {
    return knownError(e, { P2002: "A session is already running.", P2003: "That activity is gone. Reload and try again." });
  }
}

/** The set, if it belongs to the running session. */
async function liveSet(setId: string) {
  const workoutId = await liveWorkoutId();
  if (!workoutId) return null;
  return prisma.workoutSet.findFirst({ where: { id: setId, workoutId }, select: { id: true, workoutId: true, exerciseId: true, position: true, reps: true, seconds: true } });
}

/** Adds an exercise to the running session: one set, at last time's number (or 10 reps / 30 s). */
export async function addLiveExercise(exerciseId: string): Promise<WorkoutResult> {
  await requireAuth();
  const workoutId = await liveWorkoutId();
  if (!workoutId) return { ok: false, error: "No session is running." };
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId }, select: { id: true, measure: true } });
  if (!exercise || !isMeasure(exercise.measure)) return { ok: false, error: "That exercise is gone." };
  const value = (await lastValues([exercise.id])).get(exercise.id)?.[0] ?? DEFAULT_START[exercise.measure];
  const max = await prisma.workoutSet.aggregate({ where: { workoutId }, _max: { position: true } });
  await prisma.workoutSet.create({
    data: {
      workoutId,
      exerciseId: exercise.id,
      position: (max._max.position ?? -1) + 1,
      reps: exercise.measure === "reps" ? value : null,
      seconds: exercise.measure === "time" ? value : null,
      done: false,
    },
  });
  revalidate();
  return { ok: true };
}

/** One more set of an exercise, a copy of its last set, right after it. */
export async function addLiveSet(exerciseId: string): Promise<WorkoutResult> {
  await requireAuth();
  const workoutId = await liveWorkoutId();
  if (!workoutId) return { ok: false, error: "No session is running." };
  const lastOfIt = await prisma.workoutSet.findFirst({ where: { workoutId, exerciseId }, orderBy: { position: "desc" } });
  if (!lastOfIt) return addLiveExercise(exerciseId);
  await prisma.$transaction([
    prisma.workoutSet.updateMany({ where: { workoutId, position: { gt: lastOfIt.position } }, data: { position: { increment: 1 } } }),
    prisma.workoutSet.create({
      data: { workoutId, exerciseId, position: lastOfIt.position + 1, reps: lastOfIt.reps, seconds: lastOfIt.seconds, done: false },
    }),
  ]);
  revalidate();
  return { ok: true };
}

/** Sets a set's reps or seconds. */
export async function updateLiveSet(setId: string, value: number): Promise<WorkoutResult> {
  await requireAuth();
  const set = await liveSet(setId);
  if (!set) return { ok: false, error: "That set is gone." };
  const time = set.seconds !== null;
  const v = wholeNumber(value, 1, time ? LIMITS.seconds : LIMITS.reps);
  if (v === null) return { ok: false, error: time ? "A hold is 1 s to 2 h." : "Reps are 1 to 1000." };
  await prisma.workoutSet.update({ where: { id: set.id }, data: time ? { seconds: v } : { reps: v } });
  revalidate();
  return { ok: true };
}

export async function removeLiveSet(setId: string): Promise<WorkoutResult> {
  await requireAuth();
  const set = await liveSet(setId);
  if (!set) return { ok: true };
  await prisma.workoutSet.delete({ where: { id: set.id } });
  revalidate();
  return { ok: true };
}

/** Ticks a set off (or back on); ticking starts the rest countdown, kept in the DB for other devices. */
export async function tickLiveSet(setId: string, done: boolean, restSeconds: number): Promise<{ ok: true; restUntil: string | null } | { ok: false; error: string }> {
  await requireAuth();
  const set = await liveSet(setId);
  if (!set) return { ok: false, error: "That set is gone." };
  const rest = wholeNumber(restSeconds, 0, LIMITS.rest) ?? DEFAULT_REST_SECONDS;
  const restUntil = done && rest > 0 ? new Date(Date.now() + rest * 1000) : null;
  await prisma.$transaction([
    prisma.workoutSet.update({ where: { id: set.id }, data: { done } }),
    prisma.workoutLive.update({ where: { id: "current" }, data: { restUntil } }),
  ]);
  revalidate();
  return { ok: true, restUntil: restUntil?.toISOString() ?? null };
}

/** Moves the rest countdown (Skip = 0, +15 s). */
export async function setRest(until: string | null): Promise<WorkoutResult> {
  await requireAuth();
  const date = until ? new Date(until) : null;
  if (date && Number.isNaN(date.getTime())) return { ok: false, error: "That time isn't valid." };
  await prisma.workoutLive.updateMany({ where: { id: "current" }, data: { restUntil: date } });
  return { ok: true };
}

/** Ends the running session: duration from the clock (editable), only ticked sets kept, how it went. */
export async function finishWorkout(_prev: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  await requireAuth();
  const workoutId = await liveWorkoutId();
  if (!workoutId || workoutId !== String(formData.get("id"))) return { ok: false, error: "That session isn't running any more." };
  const durationMin = wholeNumber(formData.get("durationMin"), 1, LIMITS.durationMin);
  if (durationMin === null) return { ok: false, error: "How long did it take? 1 minute to 24 hours." };
  const details = await readDetails(formData);
  if ("error" in details) return { ok: false, error: details.error };
  const workout = await prisma.workout.findUnique({ where: { id: workoutId }, select: { startedAt: true, activity: { select: { kind: true } } } });
  if (!workout) return { ok: false, error: "That session is gone." };

  const endedAt = new Date(Math.max(Date.now(), workout.startedAt.getTime() + durationMin * 60_000));
  try {
    await prisma.$transaction([
      prisma.workoutSet.deleteMany({ where: { workoutId, done: false } }),
      prisma.workoutPerson.deleteMany({ where: { workoutId } }),
      prisma.workout.update({
        where: { id: workoutId },
        data: {
          endedAt,
          durationMin,
          distanceKm: workout.activity.kind === "cardio" ? details.distanceKm : null,
          effort: details.effort,
          feel: details.feel,
          place: details.place,
          note: details.note,
          people: { create: details.people.map((personId) => ({ personId })) },
        },
      }),
      prisma.workoutLive.delete({ where: { id: "current" } }),
    ]);
  } catch (e) {
    return knownError(e, { P2025: "That session was already finished." });
  }
  revalidate();
  return { ok: true, at: Date.now(), id: workoutId };
}

/** Throws the running session away. */
export async function discardWorkout(): Promise<WorkoutResult> {
  await requireAuth();
  const workoutId = await liveWorkoutId();
  if (workoutId) await prisma.workout.deleteMany({ where: { id: workoutId, endedAt: null } });
  revalidate();
  return { ok: true };
}

/* ---------- activities and exercises ---------- */

function readName(raw: unknown): { name: string } | { error: string } {
  const name = clean(raw);
  if (!name) return { error: "Give it a name." };
  if (name.length > LIMITS.name) return { error: `Keep the name to ${LIMITS.name} characters.` };
  return { name };
}

export async function saveActivity(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "") || null;
  const n = readName(formData.get("name"));
  if ("error" in n) return { ok: false, error: n.error };
  const kind = String(formData.get("kind") ?? "");
  if (!isActivityKind(kind)) return { ok: false, error: "Pick cardio, sport or bodyweight." };
  try {
    if (id) {
      await prisma.workoutActivity.update({ where: { id }, data: { name: n.name, kind } });
    } else {
      const count = await prisma.workoutActivity.count();
      await prisma.workoutActivity.create({ data: { name: n.name, kind, sortOrder: count, color: CATEGORY_COLOR_SLOTS[count % CATEGORY_COLOR_SLOTS.length] } });
    }
  } catch (e) {
    return knownError(e, { P2002: "There's already an activity with that name.", P2025: "That activity is gone." });
  }
  revalidate();
  return { ok: true, at: Date.now() };
}

export async function setActivityArchived(id: string, archived: boolean): Promise<WorkoutResult> {
  await requireAuth();
  await prisma.workoutActivity.updateMany({ where: { id }, data: { isArchived: archived } });
  revalidate();
  return { ok: true };
}

/** Moves an activity one place up (-1) or down (1) among the active ones. */
export async function moveActivity(id: string, direction: -1 | 1): Promise<WorkoutResult> {
  await requireAuth();
  const list = await prisma.workoutActivity.findMany({ where: { isArchived: false }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const i = list.findIndex((a) => a.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((a, sortOrder) => prisma.workoutActivity.update({ where: { id: a.id }, data: { sortOrder } })));
  revalidate();
  return { ok: true };
}

export async function deleteActivity(id: string): Promise<WorkoutResult> {
  await requireAuth();
  try {
    await prisma.workoutActivity.delete({ where: { id } });
  } catch (e) {
    return knownError(e, { P2003: "It has workouts or templates. Archive it instead.", P2025: "That activity is already gone." });
  }
  revalidate();
  return { ok: true };
}

export async function saveExercise(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "") || null;
  const n = readName(formData.get("name"));
  if ("error" in n) return { ok: false, error: n.error };
  const measure = String(formData.get("measure") ?? "");
  if (!isMeasure(measure)) return { ok: false, error: "Pick reps or time." };
  try {
    if (id) {
      const used = await prisma.workoutSet.count({ where: { exerciseId: id } });
      const current = await prisma.exercise.findUnique({ where: { id }, select: { measure: true } });
      if (current && used > 0 && current.measure !== measure) return { ok: false, error: "It has sets already, so reps or time can't change." };
      await prisma.exercise.update({ where: { id }, data: { name: n.name, measure } });
    } else {
      await prisma.exercise.create({ data: { name: n.name, measure } });
    }
  } catch (e) {
    return knownError(e, { P2002: "There's already an exercise with that name.", P2025: "That exercise is gone." });
  }
  revalidate();
  return { ok: true, at: Date.now() };
}

export async function setExerciseArchived(id: string, archived: boolean): Promise<WorkoutResult> {
  await requireAuth();
  await prisma.exercise.updateMany({ where: { id }, data: { isArchived: archived } });
  revalidate();
  return { ok: true };
}

export async function deleteExercise(id: string): Promise<WorkoutResult> {
  await requireAuth();
  try {
    await prisma.exercise.delete({ where: { id } });
  } catch (e) {
    return knownError(e, { P2003: "It's in workouts or templates. Archive it instead.", P2025: "That exercise is already gone." });
  }
  revalidate();
  return { ok: true };
}

/* ---------- templates ---------- */

export async function saveTemplate(_prev: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "") || null;
  const n = readName(formData.get("name"));
  if ("error" in n) return { ok: false, error: n.error };
  const activity = await prisma.workoutActivity.findUnique({ where: { id: String(formData.get("activityId") ?? "") }, select: { id: true } });
  if (!activity) return { ok: false, error: "Pick an activity." };
  const note = optionalText(formData.get("note"), LIMITS.note, "note");
  if ("error" in note) return { ok: false, error: note.error };

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("exercises") || "[]"));
  } catch {
    return { ok: false, error: "Those exercises couldn't be read." };
  }
  if (!Array.isArray(parsed) || parsed.length > 30) return { ok: false, error: "Those exercises couldn't be read." };
  const exercises: { exerciseId: string; position: number; sets: number; target: number; restSeconds: number }[] = [];
  for (const [position, raw] of (parsed as Record<string, unknown>[]).entries()) {
    const sets = wholeNumber(raw.sets, 1, LIMITS.sets);
    const target = wholeNumber(raw.target, 1, LIMITS.seconds);
    const restSeconds = wholeNumber(raw.restSeconds, 0, LIMITS.rest);
    if (sets === null || target === null || restSeconds === null) return { ok: false, error: "Sets are 1–10, the target at least 1, rest 0–600 s." };
    exercises.push({ exerciseId: String(raw.exerciseId), position, sets, target, restSeconds });
  }

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const data = { name: n.name, activityId: activity.id, note: note.value };
      if (!id) return tx.workoutTemplate.create({ data: { ...data, sortOrder: await tx.workoutTemplate.count(), exercises: { create: exercises } }, select: { id: true } });
      await tx.templateExercise.deleteMany({ where: { templateId: id } });
      return tx.workoutTemplate.update({ where: { id }, data: { ...data, exercises: { create: exercises } }, select: { id: true } });
    });
    revalidate();
    return { ok: true, at: Date.now(), id: saved.id };
  } catch (e) {
    return knownError(e, {
      P2002: "There's already a template with that name.",
      P2003: "One of those exercises is gone. Reload and try again.",
      P2025: "That template is gone.",
    });
  }
}

export async function deleteTemplate(id: string): Promise<WorkoutResult> {
  await requireAuth();
  await prisma.workoutTemplate.deleteMany({ where: { id } });
  revalidate();
  return { ok: true };
}

/** A template from a finished workout: its exercises, as many sets, the best set as target. */
export async function saveAsTemplate(workoutId: string, rawName: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAuth();
  const n = readName(rawName);
  if ("error" in n) return { ok: false, error: n.error };
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { activityId: true, sets: { orderBy: { position: "asc" }, select: { exerciseId: true, reps: true, seconds: true } } },
  });
  if (!workout) return { ok: false, error: "That workout is gone." };
  const order: string[] = [];
  const byExercise = new Map<string, number[]>();
  for (const s of workout.sets) {
    if (!byExercise.has(s.exerciseId)) order.push(s.exerciseId);
    byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s.seconds ?? s.reps ?? 1]);
  }
  try {
    const t = await prisma.workoutTemplate.create({
      data: {
        name: n.name,
        activityId: workout.activityId,
        sortOrder: await prisma.workoutTemplate.count(),
        exercises: {
          create: order.map((exerciseId, position) => {
            const values = byExercise.get(exerciseId)!;
            return { exerciseId, position, sets: Math.min(values.length, LIMITS.sets), target: Math.max(...values), restSeconds: DEFAULT_REST_SECONDS };
          }),
        },
      },
      select: { id: true },
    });
    revalidate();
    return { ok: true, id: t.id };
  } catch (e) {
    return knownError(e, { P2002: "There's already a template with that name." });
  }
}

/* ---------- goal and weight ---------- */

/** Workouts a week to aim for; null removes the goal (and the streak). */
export async function setGoal(perWeek: number | null): Promise<WorkoutResult> {
  await requireAuth();
  if (perWeek === null) {
    await prisma.workoutGoal.deleteMany({ where: { id: "current" } });
  } else {
    const n = wholeNumber(perWeek, 1, LIMITS.goal);
    if (n === null) return { ok: false, error: "Pick 1 to 14 a week." };
    await prisma.workoutGoal.upsert({ where: { id: "current" }, create: { id: "current", perWeek: n }, update: { perWeek: n } });
  }
  revalidate();
  return { ok: true };
}

/** One weigh-in per day: a second one the same day replaces it. */
export async function logWeight(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  await requireAuth();
  const date = parseDateKey(formData.get("date"));
  if (!date) return { ok: false, error: "That date isn't valid." };
  if (date > (await getTodayKey())) return { ok: false, error: "That day hasn't happened yet." };
  const kg = optionalNumber(formData.get("kg"));
  if (kg === null || kg === undefined || kg < LIMITS.minKg || kg > LIMITS.maxKg) return { ok: false, error: `A weight between ${LIMITS.minKg} and ${LIMITS.maxKg} kg.` };
  const value = Math.round(kg * 100) / 100;
  await prisma.bodyWeight.upsert({ where: { date: utc(date) }, create: { date: utc(date), kg: value }, update: { kg: value } });
  revalidate();
  return { ok: true, at: Date.now() };
}

export async function deleteWeight(date: string): Promise<WorkoutResult> {
  await requireAuth();
  const key = parseDateKey(date);
  if (key) await prisma.bodyWeight.deleteMany({ where: { date: utc(key) } });
  revalidate();
  return { ok: true };
}
