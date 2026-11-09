"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  deleteActivity,
  deleteExercise,
  moveActivity,
  saveActivity,
  saveExercise,
  setActivityArchived,
  setExerciseArchived,
  setGoal,
  type SimpleFormState,
} from "@/lib/actions/workouts";
import { ACTIVITY_KIND_LABELS, ACTIVITY_KINDS, type Activity, type ExerciseRow } from "@/lib/workouts/types";
import { ActivityDot, FIELD } from "@/components/workouts/ui";
import { Disclosure } from "@/components/Disclosure";

const FAILED = "Couldn't save that. Check your connection and try again.";

function useRun() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      try {
        const r = await fn();
        if (!r.ok) setError(r.error ?? FAILED);
      } catch {
        setError(FAILED);
      }
    });
  return { error, pending, run };
}

function ErrorLine({ error }: { error: string | null | undefined }) {
  return error ? (
    <p role="alert" className="text-sm text-critical">
      {error}
    </p>
  ) : null;
}

/* ---------- weekly goal ---------- */

export function GoalPicker({ goal }: { goal: number | null }) {
  const { error, pending, run } = useRun();
  const options: (number | null)[] = [null, 1, 2, 3, 4, 5, 6, 7];
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Workouts a week" className="flex flex-wrap gap-2">
        {options.map((n) => {
          const on = goal === n;
          return (
            <button
              key={n ?? "none"}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={pending}
              onClick={() => run(() => setGoal(n))}
              className={`btn min-h-11 min-w-11 px-3 text-sm ${on ? "bg-primary text-primary-foreground" : "btn-outline"}`}
            >
              {n === null ? "None" : n}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-ink-muted">
        {goal === null ? "No goal: no streak, and the coach won't nag." : `${goal} a week. Weeks that make it build your streak.`}
      </p>
      <ErrorLine error={error} />
    </div>
  );
}

/* ---------- activities ---------- */

function ActivityForm({ activity, onDone }: { activity?: Activity; onDone?: () => void }) {
  const [state, action, pending] = useActionState<SimpleFormState, FormData>(saveActivity, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      {activity && <input type="hidden" name="id" value={activity.id} />}
      <div className="flex flex-wrap gap-2">
        <label className="min-w-40 flex-1">
          <span className="sr-only">Name</span>
          <input name="name" required maxLength={40} defaultValue={activity?.name} placeholder="New activity (Padel…)" className={`${FIELD} w-full`} />
        </label>
        <label>
          <span className="sr-only">Kind</span>
          <select name="kind" defaultValue={activity?.kind ?? "sport"} className={FIELD}>
            {ACTIVITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {ACTIVITY_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary min-h-11 px-4 text-sm">
          {activity ? "Save" : "Add"}
        </button>
        {activity && (
          <button type="button" onClick={onDone} className="btn btn-ghost min-h-11 px-3 text-sm">
            Cancel
          </button>
        )}
      </div>
      <ErrorLine error={state && !state.ok ? state.error : null} />
    </form>
  );
}

export function ActivityManager({ activities }: { activities: Activity[] }) {
  const { error, pending, run } = useRun();
  const [editing, setEditing] = useState<string | null>(null);
  const active = activities.filter((a) => !a.isArchived);
  const archived = activities.filter((a) => a.isArchived);

  const row = (a: Activity, i: number, list: Activity[]) =>
    editing === a.id ? (
      <li key={a.id} className="py-2">
        <ActivityForm activity={a} onDone={() => setEditing(null)} />
      </li>
    ) : (
      <li key={a.id} className="flex min-h-14 items-center gap-2 py-1">
        <ActivityDot activity={a} />
        <button type="button" onClick={() => setEditing(a.id)} className="flex min-h-11 min-w-0 flex-1 flex-col items-start text-left">
          <span className="truncate font-medium text-foreground">{a.name}</span>
          <span className="text-xs text-ink-muted">
            {ACTIVITY_KIND_LABELS[a.kind]} · {a.workoutCount} {a.workoutCount === 1 ? "workout" : "workouts"}
          </span>
        </button>
        {!a.isArchived && (
          <>
            <button type="button" aria-label={`Move ${a.name} up`} disabled={pending || i === 0} onClick={() => run(() => moveActivity(a.id, -1))} className="btn btn-ghost flex h-11 w-11">
              <ArrowUp size={16} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Move ${a.name} down`} disabled={pending || i === list.length - 1} onClick={() => run(() => moveActivity(a.id, 1))} className="btn btn-ghost flex h-11 w-11">
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          </>
        )}
        {a.workoutCount === 0 ? (
          <button type="button" disabled={pending} onClick={() => run(() => deleteActivity(a.id))} className="btn btn-ghost min-h-11 px-3 text-sm text-critical">
            Delete
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => setActivityArchived(a.id, !a.isArchived))} className="btn btn-ghost min-h-11 px-3 text-sm">
            {a.isArchived ? "Bring back" : "Archive"}
          </button>
        )}
      </li>
    );

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-border">{active.map(row)}</ul>
      <ActivityForm />
      {archived.length > 0 && (
        <Disclosure title={`Archived (${archived.length})`}>
          <ul className="divide-y divide-border">{archived.map(row)}</ul>
        </Disclosure>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/* ---------- exercises ---------- */

function ExerciseForm({ exercise, onDone }: { exercise?: ExerciseRow; onDone?: () => void }) {
  const [state, action, pending] = useActionState<SimpleFormState, FormData>(saveExercise, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      {exercise && <input type="hidden" name="id" value={exercise.id} />}
      <div className="flex flex-wrap gap-2">
        <label className="min-w-40 flex-1">
          <span className="sr-only">Name</span>
          <input name="name" required maxLength={40} defaultValue={exercise?.name} placeholder="New exercise (Dips…)" className={`${FIELD} w-full`} />
        </label>
        <label>
          <span className="sr-only">Counted in</span>
          <select name="measure" defaultValue={exercise?.measure ?? "reps"} className={FIELD}>
            <option value="reps">Reps</option>
            <option value="time">Time (hold)</option>
          </select>
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary min-h-11 px-4 text-sm">
          {exercise ? "Save" : "Add"}
        </button>
        {exercise && (
          <button type="button" onClick={onDone} className="btn btn-ghost min-h-11 px-3 text-sm">
            Cancel
          </button>
        )}
      </div>
      <ErrorLine error={state && !state.ok ? state.error : null} />
    </form>
  );
}

export function ExerciseManager({ exercises }: { exercises: ExerciseRow[] }) {
  const { error, pending, run } = useRun();
  const [editing, setEditing] = useState<string | null>(null);
  const active = exercises.filter((e) => !e.isArchived);
  const archived = exercises.filter((e) => e.isArchived);

  const row = (e: ExerciseRow) =>
    editing === e.id ? (
      <li key={e.id} className="py-2">
        <ExerciseForm exercise={e} onDone={() => setEditing(null)} />
      </li>
    ) : (
      <li key={e.id} className="flex min-h-14 items-center gap-2 py-1">
        <button type="button" onClick={() => setEditing(e.id)} className="flex min-h-11 min-w-0 flex-1 flex-col items-start text-left">
          <span className="truncate font-medium text-foreground">{e.name}</span>
          <span className="text-xs text-ink-muted">
            {e.measure === "time" ? "Time" : "Reps"} · {e.setCount} {e.setCount === 1 ? "set" : "sets"} logged
          </span>
        </button>
        {e.setCount === 0 ? (
          <button type="button" disabled={pending} onClick={() => run(() => deleteExercise(e.id))} className="btn btn-ghost min-h-11 px-3 text-sm text-critical">
            Delete
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => setExerciseArchived(e.id, !e.isArchived))} className="btn btn-ghost min-h-11 px-3 text-sm">
            {e.isArchived ? "Bring back" : "Archive"}
          </button>
        )}
      </li>
    );

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-border">{active.map(row)}</ul>
      <ExerciseForm />
      {archived.length > 0 && (
        <Disclosure title={`Archived (${archived.length})`}>
          <ul className="divide-y divide-border">{archived.map(row)}</ul>
        </Disclosure>
      )}
      <ErrorLine error={error} />
    </div>
  );
}
