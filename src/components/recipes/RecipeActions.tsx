"use client";

import { useState, useTransition } from "react";
import { markRecipeMade, removeSavedRecipe } from "@/lib/actions/recipes";
import { formatDate } from "@/lib/format";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

/** Mark as made (with a date), put back on the list, or remove. */
export function RecipeActions({ id, madeOn, todayKey }: { id: string; madeOn: string | null; todayKey: string }) {
  const [date, setDate] = useState(madeOn ?? todayKey);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, then?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else then?.();
    });
  }

  return (
    <div className="flex flex-col gap-3 card">
      {madeOn && (
        <p className="text-sm font-medium text-positive-text">Made on {formatDate(madeOn)}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          max={todayKey}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Day you made it"
          className="min-h-12 flex-1 rounded-full border border-border bg-background px-4 text-foreground"
        />
        <button
          type="button"
          disabled={pending || !date}
          onClick={() => run(() => markRecipeMade(id, date))}
          className="btn btn-primary flex min-h-12 flex-1 px-5 font-semibold"
        >
          {madeOn ? "Change date" : "Mark as made"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {madeOn && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => markRecipeMade(id, null))}
            className="btn btn-outline min-h-11 px-5 text-sm"
          >
            Not made yet
          </button>
        )}
        <ConfirmButton
          onConfirm={() => run(() => removeSavedRecipe(id))}
          disabled={pending}
          confirmLabel="Tap again to remove"
          aria-label="Remove from saved (it can turn up in the deck again)"
          className="min-h-11 px-5 text-sm"
        >
          Remove
        </ConfirmButton>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
