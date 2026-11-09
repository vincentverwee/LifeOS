"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Plus, X } from "lucide-react";
import {
  addLiveExercise,
  addLiveSet,
  discardWorkout,
  finishWorkout,
  removeLiveSet,
  setRest,
  tickLiveSet,
  updateLiveSet,
  type WorkoutFormState,
} from "@/lib/actions/workouts";
import { clearSessionNotification } from "@/lib/workouts/sessionNotification";
import { DEFAULT_REST_SECONDS, formatSeconds, groupSets, LIMITS, type ExerciseRow, type WorkoutSetView, type WorkoutView } from "@/lib/workouts/types";
import { useNowSeconds } from "@/components/lessons/useNowSeconds";
import { SheepCheckbox } from "@/components/reminders/SheepCheckbox";
import { Sheet } from "@/components/recipes/Sheet";
import { Stepper } from "@/components/workouts/Stepper";
import { ElapsedClock } from "@/components/workouts/ElapsedClock";
import { HowItWent } from "@/components/workouts/HowItWent";
import { FIELD } from "@/components/workouts/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

const FAILED = "Couldn't save that. Check your connection and try again.";
const SAVE_DELAY_MS = 600;

/** When a rest of `seconds` started now ends (ISO). */
function restEnd(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // no vibration (iOS): the screen shows it
  }
}

/** The rest countdown under the header: Skip / +15 s; turns green with a buzz at 0. */
function RestBar({ until, onChange }: { until: string | null; onChange: (until: string | null) => void }) {
  const now = useNowSeconds();
  const end = until ? Math.floor(new Date(until).getTime() / 1000) : null;
  const left = end !== null && now !== null ? end - now : null;
  const buzzed = useRef<string | null>(null);

  useEffect(() => {
    if (left !== null && left <= 0 && until && buzzed.current !== until) {
      buzzed.current = until;
      buzz([200, 100, 200]);
    }
  }, [left, until]);

  if (left === null || left < -5) return null;
  const over = left <= 0;
  return (
    <div
      role="timer"
      aria-live="polite"
      className={`sticky top-2 z-30 flex items-center gap-3 rounded-2xl border p-3 shadow-md ${over ? "border-good bg-good/15" : "border-border bg-surface"}`}
    >
      <span className={`font-mono text-2xl font-semibold tabular-nums ${over ? "text-positive-text" : "text-foreground"}`}>
        {over ? "Go!" : formatSeconds(left)}
      </span>
      <span className="flex-1 text-sm text-ink-muted">{over ? "Rest's over" : "Rest"}</span>
      {!over && end !== null && (
        <button type="button" onClick={() => onChange(new Date((end + 15) * 1000).toISOString())} className="btn btn-outline min-h-11 px-3 text-sm">
          +15 s
        </button>
      )}
      <button type="button" onClick={() => onChange(null)} className="btn btn-ghost min-h-11 px-3 text-sm">
        {over ? "OK" : "Skip"}
      </button>
    </div>
  );
}

/** A hold timer for a timed set: counts down its seconds, then buzzes and ticks the set. */
function HoldTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = useNowSeconds();
  const left = endsAt !== null && now !== null ? endsAt - now : null;

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  function toggle() {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    if (endsAt !== null) return setEndsAt(null);
    setEndsAt(Math.floor(Date.now() / 1000) + seconds);
    timeout.current = setTimeout(() => {
      setEndsAt(null);
      buzz(300);
      onDone();
    }, seconds * 1000);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={endsAt === null ? `Start a ${seconds} second hold` : "Stop the hold"}
      className={`btn flex min-h-11 min-w-16 gap-1 px-2 font-mono text-sm tabular-nums ${endsAt === null ? "btn-outline" : "btn-primary"}`}
    >
      {endsAt === null ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
      {left !== null ? formatSeconds(Math.max(0, left)) : formatSeconds(seconds)}
    </button>
  );
}

/**
 * The running workout: the clock, each exercise's sets (prefilled from last time, − / + to change,
 * the sheep box ticks one off and starts the rest countdown), add sets or exercises, then Finish
 * (how it went) or Discard. Everything is saved as you go, so another device can carry on.
 */
export function LiveSession({
  workout,
  restUntil,
  exercises,
  restFor,
  places,
  everyone,
}: {
  workout: WorkoutView;
  restUntil: string | null;
  exercises: ExerciseRow[];
  /** Rest after a set, per exercise (from the template); else DEFAULT_REST_SECONDS. */
  restFor: Record<string, number>;
  places: string[];
  everyone: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Local edits on top of what the server sent, until the next refresh confirms them.
  const [values, setValues] = useState<Record<string, number>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [rest, setRestLocal] = useState<string | null>(restUntil);
  const [finishing, setFinishing] = useState(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // A refresh (this device or another) brings the truth: drop local edits it now matches, and
  // take its rest countdown (adjusting state while rendering, React's way to follow new props).
  const serverKey = JSON.stringify(workout.sets.map((s) => [s.id, s.reps, s.seconds, s.done]));
  const [seenKey, setSeenKey] = useState(serverKey);
  if (seenKey !== serverKey) {
    setSeenKey(serverKey);
    setValues((v) => Object.fromEntries(Object.entries(v).filter(([id, n]) => workout.sets.some((s) => s.id === id && (s.seconds ?? s.reps) !== n))));
    setDone((d) => Object.fromEntries(Object.entries(d).filter(([id, b]) => workout.sets.some((s) => s.id === id && s.done !== b))));
  }
  const [seenRest, setSeenRest] = useState(restUntil);
  if (seenRest !== restUntil) {
    setSeenRest(restUntil);
    setRestLocal(restUntil);
  }

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | unknown>) =>
    startTransition(async () => {
      setError(null);
      try {
        const r = (await fn()) as { ok?: boolean; error?: string } | undefined;
        if (r && r.ok === false) setError(r.error ?? FAILED);
      } catch {
        setError(FAILED);
      }
    });

  const valueOf = (s: WorkoutSetView) => values[s.id] ?? s.seconds ?? s.reps ?? 1;
  const doneOf = (s: WorkoutSetView) => done[s.id] ?? s.done;

  function change(s: WorkoutSetView, value: number) {
    setValues((v) => ({ ...v, [s.id]: value }));
    clearTimeout(timers.current.get(s.id));
    timers.current.set(
      s.id,
      setTimeout(() => run(() => updateLiveSet(s.id, value)), SAVE_DELAY_MS),
    );
  }

  function tick(s: WorkoutSetView, next: boolean) {
    setDone((d) => ({ ...d, [s.id]: next }));
    const restSeconds = restFor[s.exerciseId] ?? DEFAULT_REST_SECONDS;
    setRestLocal(next && restSeconds > 0 ? restEnd(restSeconds) : null);
    run(async () => {
      const r = await tickLiveSet(s.id, next, restSeconds);
      if (r.ok) setRestLocal(r.restUntil);
      return r;
    });
  }

  function changeRest(until: string | null) {
    setRestLocal(until);
    run(() => setRest(until));
  }

  function discard() {
    run(async () => {
      await discardWorkout();
      void clearSessionNotification();
      router.push("/workouts");
    });
  }

  const groups = groupSets(workout.sets);
  const available = exercises.filter((e) => !e.isArchived && !groups.some((g) => g[0].exerciseId === e.id));
  const doneCount = workout.sets.filter(doneOf).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">{workout.templateName ?? "Free session"}</p>
          <h1 className="text-2xl font-semibold text-foreground">{workout.activity.name}</h1>
          {workout.sets.length > 0 && (
            <p className="text-sm text-ink-muted">
              {doneCount} of {workout.sets.length} sets done
            </p>
          )}
        </div>
        <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
          <ElapsedClock since={workout.startedAt} />
        </p>
      </div>

      <RestBar until={rest} onChange={changeRest} />

      {groups.map((group) => {
        const first = group[0];
        return (
          <section key={first.exerciseId} className="card">
            <h2 className="font-semibold text-foreground">{first.exerciseName}</h2>
            <ol className="mt-2 flex flex-col gap-2">
              {group.map((s, i) => {
                const isDone = doneOf(s);
                return (
                  <li key={s.id} className={`flex items-center gap-2 ${isDone ? "opacity-70" : ""}`}>
                    <SheepCheckbox checked={isDone} label={`${first.exerciseName} set ${i + 1}`} onChange={() => tick(s, !isDone)} />
                    <Stepper value={valueOf(s)} measure={s.measure} label={`${first.exerciseName} set ${i + 1}`} onChange={(v) => change(s, v)} />
                    {s.measure === "time" && !isDone && <HoldTimer seconds={valueOf(s)} onDone={() => tick(s, true)} />}
                    <button
                      type="button"
                      onClick={() => run(() => removeLiveSet(s.id))}
                      aria-label={`Remove set ${i + 1}`}
                      className="btn btn-ghost ml-auto flex h-11 w-11 shrink-0 text-ink-muted"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ol>
            <button type="button" onClick={() => run(() => addLiveSet(first.exerciseId))} disabled={pending} className="btn btn-ghost mt-1 inline-flex min-h-11 gap-1 px-3 text-sm">
              <Plus size={16} aria-hidden="true" /> Set
            </button>
          </section>
        );
      })}

      {available.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">{groups.length === 0 ? "Doing exercises? Add one" : "Add an exercise"}</span>
          <select
            value=""
            disabled={pending}
            onChange={(e) => {
              const id = e.target.value;
              if (id) run(() => addLiveExercise(id));
            }}
            className={FIELD}
          >
            <option value="">Pick an exercise…</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.measure === "time" ? "time" : "reps"})
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => setFinishing(true)} className="btn btn-primary min-h-12 flex-1 px-5 font-semibold">
          Finish
        </button>
        <ConfirmButton
          onConfirm={discard}
          disabled={pending}
          confirmLabel="Tap again to throw it away"
          className="min-h-12 px-5 text-sm"
        >
          Discard
        </ConfirmButton>
      </div>

      <Sheet open={finishing} onOpenChange={setFinishing} title="How did it go?">
        <FinishForm workout={workout} doneCount={doneCount} places={places} everyone={everyone} />
      </Sheet>
    </div>
  );
}

function FinishForm({
  workout,
  doneCount,
  places,
  everyone,
}: {
  workout: WorkoutView;
  doneCount: number;
  places: string[];
  everyone: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<WorkoutFormState, FormData>(finishWorkout, null);
  // The clock's minutes when the sheet opened, at least 1.
  const [minutes] = useState(() => String(Math.max(1, Math.round((Date.now() - new Date(workout.startedAt).getTime()) / 60_000))));

  useEffect(() => {
    if (state?.ok) {
      void clearSessionNotification();
      router.push(`/workouts/${state.id}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={workout.id} />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">How long (minutes)</span>
        <input name="durationMin" inputMode="numeric" required min={1} max={LIMITS.durationMin} defaultValue={minutes} className={FIELD} />
      </label>
      {workout.sets.length > doneCount && (
        <p className="text-sm text-ink-muted">
          Sets you didn&apos;t tick off ({workout.sets.length - doneCount}) are left out.
        </p>
      )}
      <HowItWent
        kind={workout.activity.kind}
        places={places}
        everyone={everyone}
        initial={{ distanceKm: null, effort: null, feel: null, place: null, note: null, people: [] }}
      />
      {state && !state.ok && (
        <p role="alert" className="text-sm text-critical">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary min-h-12 px-5 font-semibold">
        {pending ? "Saving…" : "Save workout"}
      </button>
    </form>
  );
}
