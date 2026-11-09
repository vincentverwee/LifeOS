"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { deleteTemplate, saveTemplate, type WorkoutFormState } from "@/lib/actions/workouts";
import { DEFAULT_REST_SECONDS, LIMITS, type Activity, type ExerciseRow, type TemplateView } from "@/lib/workouts/types";
import { Stepper } from "@/components/workouts/Stepper";
import { FIELD } from "@/components/workouts/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

type Row = { key: number; exerciseId: string; sets: number; target: number; restSeconds: number };
const RESTS = [0, 30, 45, 60, 90, 120, 180];
const START = { reps: 10, time: 30 } as const;

/** A routine to start sessions from: name, activity, and exercises with sets, target and rest. */
export function TemplateForm({ template, activities, exercises }: { template?: TemplateView; activities: Activity[]; exercises: ExerciseRow[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<WorkoutFormState, FormData>(saveTemplate, null);
  const [deleting, startDelete] = useTransition();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const [rows, setRows] = useState<Row[]>(
    template?.exercises.map((e, key) => ({ key, exerciseId: e.exerciseId, sets: e.sets, target: e.target, restSeconds: e.restSeconds })) ?? [],
  );
  const [nextKey, setNextKey] = useState(rows.length);
  const shownActivities = activities.filter((a) => !a.isArchived || a.id === template?.activity.id);
  const defaultActivity = shownActivities.find((a) => a.kind === "bodyweight") ?? shownActivities[0];
  const available = exercises.filter((e) => !e.isArchived && !rows.some((r) => r.exerciseId === e.id));

  useEffect(() => {
    if (state?.ok) router.push("/workouts/settings");
  }, [state, router]);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  return (
    <form action={action} className="flex flex-col gap-5">
      {template && <input type="hidden" name="id" value={template.id} />}
      <input type="hidden" name="exercises" value={JSON.stringify(rows.map((r) => ({ exerciseId: r.exerciseId, sets: r.sets, target: r.target, restSeconds: r.restSeconds })))} />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Name</span>
        <input name="name" required maxLength={LIMITS.name} defaultValue={template?.name} placeholder="Morning core" className={FIELD} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Activity</span>
        <select name="activityId" defaultValue={template?.activity.id ?? defaultActivity?.id} className={FIELD}>
          {shownActivities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-ink-muted">Exercises</h2>
        {rows.map((r, i) => {
          const e = byId.get(r.exerciseId);
          if (!e) return null;
          return (
            <div key={r.key} className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-1">
                <p className="flex-1 font-medium text-foreground">{e.name}</p>
                <button type="button" aria-label={`Move ${e.name} up`} disabled={i === 0} onClick={() => move(i, -1)} className="btn btn-ghost flex h-11 w-11">
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Move ${e.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="btn btn-ghost flex h-11 w-11">
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Remove ${e.name}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="btn btn-ghost flex h-11 w-11 text-ink-muted">
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-10 text-sm text-ink-muted">Sets</span>
                  <Stepper value={r.sets} measure="reps" label={`${e.name} sets`} onChange={(v) => update(r.key, { sets: Math.min(LIMITS.sets, v) })} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-10 text-sm text-ink-muted">{e.measure === "time" ? "Hold" : "Reps"}</span>
                  <Stepper value={r.target} measure={e.measure} label={`${e.name} target`} onChange={(v) => update(r.key, { target: v })} />
                </div>
                <label className="flex items-center gap-2">
                  <span className="w-10 text-sm text-ink-muted">Rest</span>
                  <select value={r.restSeconds} onChange={(ev) => update(r.key, { restSeconds: Number(ev.target.value) })} className={FIELD}>
                    {RESTS.map((s) => (
                      <option key={s} value={s}>
                        {s === 0 ? "None" : s < 60 ? `${s} s` : `${s / 60} min`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          );
        })}
        {available.length > 0 && (
          <select
            value=""
            aria-label="Add an exercise"
            onChange={(ev) => {
              const e = byId.get(ev.target.value);
              if (!e) return;
              setRows((rs) => [...rs, { key: nextKey, exerciseId: e.id, sets: 3, target: START[e.measure], restSeconds: DEFAULT_REST_SECONDS }]);
              setNextKey((k) => k + 1);
            }}
            className={FIELD}
          >
            <option value="">{rows.length === 0 ? "Add an exercise…" : "Add another exercise…"}</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.measure === "time" ? "time" : "reps"})
              </option>
            ))}
          </select>
        )}
        <p className="text-xs text-ink-muted">A session from this fills in last time&apos;s numbers where there are any; the target is for the first time.</p>
      </section>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Note</span>
        <textarea name="note" rows={2} maxLength={LIMITS.note} defaultValue={template?.note ?? ""} className={FIELD} />
      </label>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-critical">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
          {pending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <SheepSpinner size={20} />
              Saving…
            </span>
          ) : template ? (
            "Save template"
          ) : (
            "Create template"
          )}
        </button>
        {template && (
          <ConfirmButton
            disabled={deleting}
            onConfirm={() =>
              startDelete(async () => {
                await deleteTemplate(template.id);
                router.push("/workouts/settings");
              })
            }
            className="min-h-12 self-start px-5 text-sm"
          >
            Delete
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
