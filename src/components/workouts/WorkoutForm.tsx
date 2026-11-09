"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveWorkout, type WorkoutFormState } from "@/lib/actions/workouts";
import { groupSets, LIMITS, type Activity, type ExerciseRow, type WorkoutView } from "@/lib/workouts/types";
import { ActivityDot, FIELD } from "@/components/workouts/ui";
import { SetsEditor } from "@/components/workouts/SetsEditor";
import { HowItWent } from "@/components/workouts/HowItWent";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

const QUICK_MINUTES = [15, 30, 45, 60, 90];

/** Log a finished workout by hand, or edit one: what, when, how long, and how it went. */
export function WorkoutForm({
  activities,
  exercises,
  lastSets,
  everyone,
  places,
  todayKey,
  nowTime,
  workout,
}: {
  activities: Activity[];
  exercises: ExerciseRow[];
  lastSets: Record<string, number[]>;
  everyone: { id: string; name: string }[];
  places: string[];
  todayKey: string;
  /** "HH:MM" now, the default start for a new one. */
  nowTime: string;
  workout?: WorkoutView;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<WorkoutFormState, FormData>(saveWorkout, null);
  const shown = activities.filter((a) => !a.isArchived || a.id === workout?.activity.id);
  const [activityId, setActivityId] = useState(workout?.activity.id ?? shown[0]?.id ?? "");
  const [minutes, setMinutes] = useState(workout?.durationMin ? String(workout.durationMin) : "");
  const activity = shown.find((a) => a.id === activityId);

  useEffect(() => {
    if (state?.ok) router.push(`/workouts/${state.id}`);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-5">
      {workout && <input type="hidden" name="id" value={workout.id} />}
      <input type="hidden" name="activityId" value={activityId} />

      <fieldset>
        <legend className="mb-2 text-sm text-ink-muted">What did you do?</legend>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {shown.map((a) => {
            const on = a.id === activityId;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setActivityId(a.id)}
                className={`btn inline-flex min-h-11 gap-2 px-4 text-sm ${on ? "bg-primary text-primary-foreground" : "btn-outline"}`}
              >
                <ActivityDot activity={a} />
                {a.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Day</span>
          <input type="date" name="date" required max={todayKey} defaultValue={workout?.date ?? todayKey} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Started</span>
          <input type="time" name="time" required defaultValue={workout?.time ?? nowTime} className={FIELD} />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">How long (minutes)</span>
          <input
            name="durationMin"
            inputMode="numeric"
            required
            min={1}
            max={LIMITS.durationMin}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
            className={FIELD}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(String(m))}
              className={`btn min-h-11 px-3 text-sm ${minutes === String(m) ? "bg-primary/15 text-foreground ring-2 ring-primary" : "bg-surface-muted text-ink-muted"}`}
            >
              {m < 60 ? `${m} min` : m === 60 ? "1 h" : "1 h 30"}
            </button>
          ))}
        </div>
      </div>

      {activity?.kind === "bodyweight" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-ink-muted">Exercises</h2>
          <SetsEditor
            exercises={exercises}
            lastSets={lastSets}
            initial={
              workout
                ? groupSets(workout.sets).map((g) => ({ exerciseId: g[0].exerciseId, values: g.map((s) => s.seconds ?? s.reps ?? 1) }))
                : []
            }
          />
        </section>
      )}

      {activity && (
        <HowItWent
          key={activity.kind}
          kind={activity.kind}
          places={places}
          everyone={everyone}
          initial={{
            distanceKm: workout?.distanceKm ?? null,
            effort: workout?.effort ?? null,
            feel: workout?.feel ?? null,
            place: workout?.place ?? null,
            note: workout?.note ?? null,
            people: workout?.people ?? [],
          }}
        />
      )}

      {state && !state.ok && (
        <p role="alert" className="text-sm text-critical">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending || !activity} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <SheepSpinner size={20} />
            Saving…
          </span>
        ) : workout ? (
          "Save changes"
        ) : (
          "Log workout"
        )}
      </button>
    </form>
  );
}
