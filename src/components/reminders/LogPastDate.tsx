"use client";

import { useActionState } from "react";
import { logRoutineOn, type RoutineFormState } from "@/lib/actions/routines";

/** "Did it on …": back-dates a log, e.g. a wash you forgot to tick. */
export function LogPastDate({ routineId, todayKey }: { routineId: string; todayKey: string }) {
  const [state, formAction, pending] = useActionState<RoutineFormState, FormData>(logRoutineOn, null);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={routineId} />
      <label htmlFor="log-date" className="text-sm text-ink-muted">
        Did it on…
      </label>
      <div className="flex gap-2">
        <input
          id="log-date"
          name="doneOn"
          type="date"
          required
          max={todayKey}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
        <button type="submit" disabled={pending} className="btn btn-outline inline-flex min-h-11 px-5 text-sm">
          Log
        </button>
      </div>
      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
      {state?.ok && <p className="text-sm text-positive-text">✓ Logged</p>}
    </form>
  );
}
