// Pure: one-line summaries of a workout for lists, the Home tile, On this day and the review.
import { describeTempo } from "./stats";
import { formatKm, formatMinutes, groupSets, type WorkoutView } from "./types";

type Summary = Pick<WorkoutView, "durationMin" | "distanceKm" | "sets"> & { activity: { name: string; kind: string } };

/** "28 min · 5,2 km · 5:12 /km" (cardio), "25 min · 4 exercises · 12 sets" (bodyweight), "1 h 30" (sport). */
export function describeWorkout(w: Summary): string {
  const parts: string[] = [];
  if (w.durationMin) parts.push(formatMinutes(w.durationMin));
  if (w.distanceKm) {
    parts.push(formatKm(w.distanceKm));
    const tempo = w.durationMin ? describeTempo(w.activity.name, w.distanceKm, w.durationMin) : null;
    if (tempo) parts.push(tempo);
  }
  if (w.sets.length > 0) {
    const exercises = groupSets(w.sets).length;
    parts.push(`${exercises} ${exercises === 1 ? "exercise" : "exercises"}`, `${w.sets.length} ${w.sets.length === 1 ? "set" : "sets"}`);
  }
  return parts.join(" · ");
}

/** "Running 5,2 km" or "Home workout · 25 min": the short headline. */
export function workoutHeadline(w: { activityName: string; distanceKm: number | null; durationMin: number | null }): string {
  if (w.distanceKm) return `${w.activityName} ${formatKm(w.distanceKm)}`;
  return w.durationMin ? `${w.activityName} · ${formatMinutes(w.durationMin)}` : w.activityName;
}
