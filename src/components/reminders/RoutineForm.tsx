"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createRoutine, updateRoutine, type RoutineFormState } from "@/lib/actions/routines";
import type { Routine } from "@/lib/reminders/routines";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

type Last = "today" | "not-yet" | "date";

const LAST_OPTIONS: { value: Last; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "date", label: "Earlier…" },
  { value: "not-yet", label: "Not yet" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SheepSpinner size={20} />
          Saving…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

/** Add (no `routine`) or edit a Last done item. Adding also logs when it was last done. */
export function RoutineForm({ routine, todayKey }: { routine?: Routine; todayKey: string }) {
  const [last, setLast] = useState<Last>("today");
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState<RoutineFormState, FormData>(
    (prev, formData) => (routine ? updateRoutine(prev, formData) : createRoutine(prev, formData)),
    null
  );

  // Desktop: straight into the name when adding; phones keep the keyboard closed.
  useEffect(() => {
    if (!routine && window.matchMedia("(min-width: 640px)").matches) nameRef.current?.focus();
  }, [routine]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {routine && <input type="hidden" name="id" value={routine.id} />}
      {!routine && <input type="hidden" name="last" value={last} />}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">What</span>
        <input
          ref={nameRef}
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="off"
          enterKeyHint="done"
          defaultValue={routine?.name}
          placeholder="e.g. Wash (coloured), Bedsheets, Training"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
      </label>

      {!routine && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-ink-muted">Last done</span>
          <div className="flex gap-1 rounded-full bg-surface-muted p-1">
            {LAST_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLast(option.value)}
                aria-pressed={last === option.value}
                className={`btn flex min-h-11 flex-1 px-3 text-sm ${
                  last === option.value ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {last === "date" && (
            <input
              name="lastDoneOn"
              type="date"
              required
              max={todayKey}
              aria-label="Last done on"
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
            />
          )}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Remind me every … days (optional)</span>
        <input
          name="everyDays"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          defaultValue={routine?.everyDays ?? ""}
          placeholder="e.g. 14"
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
        <span className="text-sm text-ink-muted">After that many days it turns red and shows up in To do.</span>
      </label>

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      <SubmitButton label={routine ? "Save changes" : "Add"} />
    </form>
  );
}
