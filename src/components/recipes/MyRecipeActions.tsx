"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteMyRecipe, markMyRecipeMade } from "@/lib/actions/myRecipes";
import { formatDate } from "@/lib/format";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

/** Mark as made (with a date), edit, or delete a Cookbook recipe. */
export function MyRecipeActions({ id, lastMadeOn, todayKey }: { id: string; lastMadeOn: string | null; todayKey: string }) {
  const [date, setDate] = useState(todayKey);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 card">
      <p className="text-sm text-ink-muted">
        {lastMadeOn ? (
          <span className="font-medium text-positive-text">Last made {formatDate(lastMadeOn)}</span>
        ) : (
          "Not made yet"
        )}
      </p>
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
          disabled={pending || !date || date === lastMadeOn}
          onClick={() => run(() => markMyRecipeMade(id, date))}
          className="btn btn-primary flex min-h-12 flex-1 px-5 font-semibold"
        >
          Made it
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/recipes/mine/${id}/edit`} className="btn btn-outline inline-flex min-h-11 px-5 text-sm">
          Edit
        </Link>
        <ConfirmButton
          onConfirm={() => run(() => deleteMyRecipe(id))}
          disabled={pending}
          confirmLabel="Tap again: gone for good"
          className="min-h-11 px-5 text-sm"
        >
          Delete
        </ConfirmButton>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
