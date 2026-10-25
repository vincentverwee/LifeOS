"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markRecipeMade, removeSavedRecipe } from "@/lib/actions/recipes";
import { formatDate } from "@/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/waypoint/ui/alert-dialog";

/** Mark as made (with a date), put back on the list, or remove. */
export function RecipeActions({ id, madeOn, todayKey }: { id: string; madeOn: string | null; todayKey: string }) {
  const router = useRouter();
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
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
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
          className="min-h-12 flex-1 rounded-xl border border-border bg-background px-3 text-foreground"
        />
        <button
          type="button"
          disabled={pending || !date}
          onClick={() => run(() => markRecipeMade(id, date))}
          className="min-h-12 flex-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
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
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            Not made yet
          </button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={pending}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-critical hover:bg-surface-muted disabled:opacity-50"
            >
              Remove
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this recipe?</AlertDialogTitle>
              <AlertDialogDescription>It disappears from your saved list. It can turn up in the deck again later.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                className="bg-critical text-primary-foreground hover:bg-critical/90"
                onClick={() => run(() => removeSavedRecipe(id), () => router.replace("/recipes/saved"))}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
