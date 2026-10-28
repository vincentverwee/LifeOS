"use client";

import { useState, useTransition } from "react";
import { deleteSubscription, setSubscriptionActive } from "@/lib/actions/subscriptions";

/** Stop/Resume and Delete for one subscription. */
export function SubscriptionActions({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await setSubscriptionActive(id, !isActive);
              setError(result.ok ? null : result.error);
            })
          }
          className="btn btn-outline min-h-11 flex-1 px-4 text-sm"
        >
          {isActive ? "Stop" : "Resume"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm(`Delete ${name}? The expenses it logged stay.`)) return;
            startTransition(async () => {
              const result = await deleteSubscription(id);
              if (!result.ok) setError(result.error);
            });
          }}
          className="btn btn-destructive min-h-11 flex-1 px-4 text-sm"
        >
          Delete
        </button>
      </div>
      <p className="text-sm text-ink-muted">
        {isActive
          ? "Stopped ones don't show up on Today any more; resuming starts again from the next renewal."
          : "Stopped. Resume to get it back on Today from its next renewal."}
      </p>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
