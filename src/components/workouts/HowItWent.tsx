"use client";

import { useState } from "react";
import { MOODS } from "@/lib/diary/onThisDay";
import { EFFORTS, LIMITS, type ActivityKind } from "@/lib/workouts/types";
import { FIELD } from "@/components/workouts/ui";
import { PeoplePicker } from "@/components/workouts/PeoplePicker";

/** Pick one of five (or none): sends `name` as 1–5 or "". */
function ScalePicker({
  name,
  label,
  options,
  initial,
}: {
  name: string;
  label: string;
  options: readonly { value: number; label: string; face?: string }[];
  initial: number | null;
}) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm text-ink-muted">{label}</legend>
      <input type="hidden" name={name} value={value ?? ""} />
      <div role="radiogroup" aria-label={label} className="flex gap-1">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.label}
              title={o.label}
              onClick={() => setValue(on ? null : o.value)}
              className={`btn flex min-h-11 flex-1 flex-col items-center justify-center px-1 ${o.face ? "text-2xl" : "text-xs font-medium"} ${
                on ? "bg-primary/15 text-foreground ring-2 ring-primary" : o.face ? "opacity-60 grayscale hover:opacity-100 hover:grayscale-0" : "bg-surface-muted text-ink-muted"
              }`}
            >
              {o.face ?? o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The "how it went" part shared by Log workout and Finish session: distance (cardio), effort, feel, place, people, note. */
export function HowItWent({
  kind,
  places,
  everyone,
  initial,
}: {
  kind: ActivityKind;
  places: string[];
  everyone: { id: string; name: string }[];
  initial: {
    distanceKm: number | null;
    effort: number | null;
    feel: number | null;
    place: string | null;
    note: string | null;
    people: { id: string; name: string }[];
  };
}) {
  return (
    <div className="flex flex-col gap-4">
      {kind === "cardio" && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Distance (km)</span>
          <input
            name="distanceKm"
            inputMode="decimal"
            placeholder="5,2"
            defaultValue={initial.distanceKm === null ? "" : String(initial.distanceKm).replace(".", ",")}
            className={FIELD}
          />
        </label>
      )}
      <ScalePicker name="effort" label="How hard was it?" options={EFFORTS} initial={initial.effort} />
      <ScalePicker name="feel" label="How do you feel?" options={MOODS} initial={initial.feel} />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Where</span>
        <input name="place" list="workout-places" maxLength={LIMITS.place} defaultValue={initial.place ?? ""} placeholder="Park, gym, living room…" className={FIELD} />
        <datalist id="workout-places">
          {places.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <PeoplePicker everyone={everyone} initial={initial.people} />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Note</span>
        <textarea name="note" rows={2} maxLength={LIMITS.note} defaultValue={initial.note ?? ""} placeholder="Legs were heavy, new route…" className={FIELD} />
      </label>
    </div>
  );
}
