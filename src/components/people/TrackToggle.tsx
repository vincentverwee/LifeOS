"use client";

import { useOptimistic, useTransition } from "react";
import { setTracking } from "@/lib/actions/people";

/**
 * The "Track seen / messaged" switch on someone's page: shows or hides the Saw them /
 * Messaged card (their history stays). With a keep-in-touch interval it's always on.
 */
export function TrackToggle({ personId, on, locked }: { personId: string; on: boolean; locked: boolean }) {
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(on);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={locked}
      onClick={() =>
        startTransition(async () => {
          setChecked(!checked);
          await setTracking(personId, !checked);
        })
      }
      className="tap -mx-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-left disabled:cursor-default"
    >
      <span
        aria-hidden="true"
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
          checked ? "bg-primary" : "bg-surface-muted ring-1 ring-border"
        } ${locked ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-[left] motion-reduce:transition-none ${
            checked ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">Track seen / messaged</span>
        {locked && <span className="text-xs text-ink-muted">Always on with keep in touch</span>}
      </span>
    </button>
  );
}
