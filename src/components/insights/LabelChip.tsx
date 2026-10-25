"use client";

import { useState, useTransition } from "react";
import { setPeriodLabel } from "@/lib/actions/cycles";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

type LabelChipProps = {
  cycleId: string | null;
  label: string | null;
  options: string[];
};

/** The period's peer group ("Thuis", "Galway"). Tap to change it. Trips can't be relabelled. */
export function LabelChip({ cycleId, label, options }: LabelChipProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!cycleId) {
    return label ? (
      <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted">{label}</span>
    ) : null;
  }

  function choose(next: string) {
    setError(null);
    startTransition(async () => {
      const result = await setPeriodLabel({ cycleId: cycleId!, label: next });
      if (result.ok) {
        setOpen(false);
        setCustom("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn inline-flex min-h-9 gap-1.5 self-start bg-surface-muted px-3 py-1 text-xs text-foreground hover:bg-gridline active:bg-gridline"
      >
        {isPending ? <SheepSpinner size={14} /> : null}
        Compared with: {label ?? "no label"}
        <span aria-hidden="true" className="text-ink-muted">
          ▾
        </span>
      </button>
      {open && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={isPending}
              onClick={() => choose(option)}
              className={`btn min-h-10 border px-4 text-sm ${
                option === label
                  ? "border-primary bg-surface-muted text-foreground"
                  : "border-border text-foreground hover:bg-surface-muted active:bg-surface-muted"
              }`}
            >
              {option}
            </button>
          ))}
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (custom.trim()) choose(custom);
            }}
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="New label"
              maxLength={24}
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
            />
            <button
              type="submit"
              disabled={!custom.trim() || isPending}
              className="btn btn-primary px-4 py-2 text-sm"
            >
              Set
            </button>
          </form>
          {error && <p className="w-full text-sm text-critical">{error}</p>}
        </div>
      )}
    </div>
  );
}
