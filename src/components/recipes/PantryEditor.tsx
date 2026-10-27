"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addPantryItems, clearPantry, removePantryItem } from "@/lib/actions/recipes";
import type { PantryEntry } from "@/lib/data/recipes";
import { COMMON_INGREDIENTS, suggestIngredients } from "@/lib/recipes/ingredients";
import { Disclosure } from "@/components/Disclosure";
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

const ALL_COMMON = COMMON_INGREDIENTS.flatMap((g) => g.items);

/** The remembered list of ingredients you have, as removable pills, with suggestions and quick-add chips. */
export function PantryEditor({ pantry, suggestions }: { pantry: PantryEntry[]; suggestions: string[] }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** `fromInput`: what was typed is now added, so empty the box. */
  function add(raw: string, fromInput: boolean) {
    if (!raw.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addPantryItems(raw);
      if (!result.ok) setError(result.error);
      else if (fromInput) setDraft("");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removePantryItem(id);
    });
  }

  const have = new Set(pantry.map((p) => p.name));
  // "eggs, tom" suggests for "tom"; tapping one adds the earlier ones too.
  const parts = draft.split(",");
  const typing = parts[parts.length - 1];
  const matches = suggestIngredients(typing, [...ALL_COMMON, ...suggestions], have);
  const pick = (name: string) => add([...parts.slice(0, -1), name].join(","), true);

  return (
    <section className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft, true);
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="eggs, spinach, feta…"
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Ingredient you have"
          className="min-h-12 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-foreground"
        />
        <button type="submit" disabled={pending || !draft.trim()} className="btn btn-primary min-h-12 px-5 font-semibold">
          Add
        </button>
      </form>
      {matches.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Suggestions">
          {matches.map((name) => (
            <li key={name}>
              <AddChip name={name} disabled={pending} onAdd={() => pick(name)} />
            </li>
          ))}
        </ul>
      )}
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
                  className="btn btn-outline inline-flex min-h-11 gap-1.5 pr-2.5 pl-3.5 text-sm first-letter:uppercase"
                >
                  {item.name}
                  <X size={15} aria-hidden="true" className="text-ink-muted" />
                </button>
              </li>
            ))}
          </ul>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" disabled={pending} className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm text-ink-muted">
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

      <div className="flex flex-col gap-2">
        {COMMON_INGREDIENTS.map(({ group, items }, i) => {
          const left = items.filter((name) => !have.has(name));
          if (left.length === 0) return null;
          return (
            <Disclosure key={group} title={`${group} (${left.length})`} defaultOpen={i === 0 && pantry.length === 0}>
              <ul className="flex flex-wrap gap-1.5">
                {left.map((name) => (
                  <li key={name}>
                    <AddChip name={name} disabled={pending} onAdd={() => add(name, false)} />
                  </li>
                ))}
              </ul>
            </Disclosure>
          );
        })}
      </div>
    </section>
  );
}

function AddChip({ name, disabled, onAdd }: { name: string; disabled: boolean; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={`Add ${name}`}
      className="btn inline-flex min-h-11 gap-1 border border-dashed border-border bg-surface pr-3.5 pl-2.5 text-sm text-foreground first-letter:uppercase hover:bg-surface-muted active:bg-surface-muted"
    >
      <Plus size={15} aria-hidden="true" className="text-primary" />
      {name}
    </button>
  );
}
