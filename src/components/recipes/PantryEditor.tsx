"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { addPantryItems, clearPantry, removePantryItem } from "@/lib/actions/recipes";
import type { PantryEntry } from "@/lib/data/recipes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/waypoint/ui/alert-dialog";

/** The remembered list of ingredients you have, as removable pills. */
export function PantryEditor({ pantry, suggestions }: { pantry: PantryEntry[]; suggestions: string[] }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    if (!draft.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addPantryItems(draft);
      if (result.ok) setDraft("");
      else setError(result.error);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removePantryItem(id);
    });
  }

  const have = new Set(pantry.map((p) => p.name));

  return (
    <section className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          list="ingredient-suggestions"
          placeholder="eggs, spinach, feta…"
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Ingredient you have"
          className="min-h-12 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-foreground"
        />
        <datalist id="ingredient-suggestions">
          {suggestions.filter((s) => !have.has(s)).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="submit" disabled={pending || !draft.trim()} className="btn btn-primary min-h-12 px-5 font-semibold">
          Add
        </button>
      </form>
      {error && <p className="text-sm text-critical">{error}</p>}

      {pantry.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-wrap gap-1.5" aria-label="Ingredients you have">
            {pantry.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={pending}
                  aria-label={`Remove ${item.name}`}
                  className="btn btn-outline inline-flex min-h-10 gap-1.5 pr-2.5 pl-3.5 text-sm first-letter:uppercase"
                >
                  {item.name}
                  <X size={15} aria-hidden="true" className="text-ink-muted" />
                </button>
              </li>
            ))}
          </ul>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" disabled={pending} className="btn btn-ghost -mx-3 inline-flex min-h-9 self-start px-3 text-sm text-ink-muted">
                Clear all
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all {pantry.length} ingredients?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep them</AlertDialogCancel>
                <AlertDialogAction destructive onClick={() => startTransition(async () => void (await clearPantry()))}>
                  Clear all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </section>
  );
}
