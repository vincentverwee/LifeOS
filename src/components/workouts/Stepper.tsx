"use client";

import { Minus, Plus } from "lucide-react";
import { LIMITS, type Measure } from "@/lib/workouts/types";

/** − [value] + for a set's reps (steps of 1) or seconds (steps of 5); the value can also be typed. */
export function Stepper({
  value,
  measure,
  onChange,
  label,
  disabled,
}: {
  value: number;
  measure: Measure;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const step = measure === "time" ? 5 : 1;
  const max = measure === "time" ? LIMITS.seconds : LIMITS.reps;
  const set = (v: number) => onChange(Math.min(max, Math.max(1, Math.round(v))));
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => set(value - step)}
        disabled={disabled || value <= 1}
        aria-label={`Less: ${label}`}
        className="btn btn-outline flex h-11 w-11 shrink-0"
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <label className="flex items-baseline gap-1">
        <span className="sr-only">{label}</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 1) set(n);
          }}
          className="w-14 rounded-lg border border-border bg-surface px-1 py-2 text-center font-mono tabular-nums text-foreground"
        />
        <span className="w-6 text-xs text-ink-muted">{measure === "time" ? "s" : "×"}</span>
      </label>
      <button
        type="button"
        onClick={() => set(value + step)}
        disabled={disabled || value >= max}
        aria-label={`More: ${label}`}
        className="btn btn-outline flex h-11 w-11 shrink-0"
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
