"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { deleteWeight } from "@/lib/actions/workouts";
import { formatDay } from "@/lib/reminders/schedule";
import { formatKg, type WeighIn } from "@/lib/workouts/weight";

/** The latest weigh-ins, each with a delete (×). */
export function WeightList({ weighIns }: { weighIns: WeighIn[] }) {
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();
  const newest = [...weighIns].reverse();
  const shown = showAll ? newest : newest.slice(0, 8);
  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-border">
        {shown.map((w) => (
          <li key={w.date} className="flex min-h-11 items-center gap-3">
            <span className="flex-1 text-sm text-ink-muted">{formatDay(w.date)}</span>
            <span className="font-mono text-sm tabular-nums text-foreground">{formatKg(w.kg)}</span>
            <button
              type="button"
              disabled={pending}
              aria-label={`Delete the weigh-in of ${formatDay(w.date)}`}
              onClick={() => startTransition(async () => void (await deleteWeight(w.date)))}
              className="btn btn-ghost flex h-11 w-11 text-ink-muted"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {newest.length > shown.length && (
        <button type="button" onClick={() => setShowAll(true)} className="btn btn-ghost min-h-11 self-start px-3 text-sm">
          Show all {newest.length}
        </button>
      )}
    </div>
  );
}
