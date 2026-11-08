"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Stepper } from "@/components/workouts/Stepper";
import { FIELD } from "@/components/workouts/ui";
import type { ExerciseRow } from "@/lib/workouts/types";

export type SetsGroup = { exerciseId: string; values: number[] };

const START = { reps: 10, time: 30 } as const;

/**
 * The bodyweight sets of a hand-logged workout: exercises, each with its sets (− / + steppers).
 * A new exercise starts from last time's sets. Sends `sets` as JSON [{ exerciseId, value }].
 */
export function SetsEditor({
  exercises,
  lastSets,
  initial,
}: {
  exercises: ExerciseRow[];
  /** Last time's sets per exercise, to prefill. */
  lastSets: Record<string, number[]>;
  initial: SetsGroup[];
}) {
  const [groups, setGroups] = useState<SetsGroup[]>(initial);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const available = exercises.filter((e) => !e.isArchived && !groups.some((g) => g.exerciseId === e.id));

  const update = (i: number, values: number[]) =>
    setGroups((gs) => (values.length === 0 ? gs.filter((_, j) => j !== i) : gs.map((g, j) => (j === i ? { ...g, values } : g))));

  function add(exerciseId: string) {
    const e = byId.get(exerciseId);
    if (!e) return;
    const last = lastSets[exerciseId];
    setGroups((gs) => [...gs, { exerciseId, values: last?.length ? last : [START[e.measure], START[e.measure], START[e.measure]] }]);
  }

  const json = JSON.stringify(groups.flatMap((g) => g.values.map((value) => ({ exerciseId: g.exerciseId, value }))));

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="sets" value={json} />
      {groups.map((g, i) => {
        const e = byId.get(g.exerciseId);
        if (!e) return null;
        return (
          <div key={g.exerciseId} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground">{e.name}</p>
              <button
                type="button"
                onClick={() => update(i, [])}
                aria-label={`Remove ${e.name}`}
                className="btn btn-ghost flex h-11 w-11 text-ink-muted"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <ol className="mt-1 flex flex-col gap-2">
              {g.values.map((v, j) => (
                <li key={j} className="flex items-center gap-2">
                  <span className="w-12 text-sm text-ink-muted">Set {j + 1}</span>
                  <Stepper
                    value={v}
                    measure={e.measure}
                    label={`${e.name} set ${j + 1}`}
                    onChange={(nv) => update(i, g.values.map((x, k) => (k === j ? nv : x)))}
                  />
                  <button
                    type="button"
                    onClick={() => update(i, g.values.filter((_, k) => k !== j))}
                    aria-label={`Remove set ${j + 1}`}
                    className="btn btn-ghost ml-auto flex h-11 w-11 text-ink-muted"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => update(i, [...g.values, g.values.at(-1) ?? START[e.measure]])}
              className="btn btn-ghost mt-1 inline-flex min-h-11 gap-1 px-3 text-sm"
            >
              <Plus size={16} aria-hidden="true" /> Set
            </button>
          </div>
        );
      })}
      {available.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">{groups.length === 0 ? "Add an exercise" : "Add another exercise"}</span>
          <select
            value=""
            onChange={(ev) => {
              add(ev.target.value);
              ev.target.value = "";
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
    </div>
  );
}
