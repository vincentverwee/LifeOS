"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { createOutfit, updateOutfit, type WardrobeFormState } from "@/lib/actions/wardrobe";
import type { Category } from "@/lib/wardrobe/types";
import { groupByCategory } from "@/lib/wardrobe/logic";
import { keepInput } from "@/components/people/keepInput";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { ItemPhoto } from "./ItemPhoto";

type Item = { id: string; name: string; categoryId: string | null; photoId: string | null; photoCutout: boolean };
type Outfit = { id: string; name: string; notes: string | null; itemIds: string[] };

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

/** Add (no `outfit`) or edit an outfit: a name and the pieces, tapped on their photos. */
export function OutfitForm({ outfit, items, categories }: { outfit?: Outfit; items: Item[]; categories: Category[] }) {
  const [state, formAction, pending] = useActionState<WardrobeFormState, FormData>(
    outfit ? updateOutfit : createOutfit,
    null,
  );
  const [picked, setPicked] = useState<Set<string>>(new Set(outfit?.itemIds ?? []));
  // An error is about the last submit: hide it once the pieces change (a new submit brings a new one).
  const [dismissed, setDismissed] = useState<WardrobeFormState>(null);

  function toggle(id: string) {
    setDismissed(state);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const groups = groupByCategory(items, categories);

  return (
    <form onSubmit={keepInput(formAction)} className="flex flex-col gap-4">
      {outfit && <input type="hidden" name="id" value={outfit.id} />}
      {[...picked].map((id) => (
        <input key={id} type="hidden" name="itemId" value={id} />
      ))}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Name</span>
        <input
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={outfit?.name}
          placeholder="e.g. Pub night"
          className={FIELD}
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm text-ink-muted">
          Pieces <span className="font-mono tabular-nums">({picked.size})</span>
        </legend>
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-sm text-ink-muted">
            An outfit is made of your clothes.{" "}
            <Link href="/wardrobe/items/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
              Add some first
            </Link>
          </p>
        )}
        {groups.map((g) => (
          <div key={g.id ?? "none"} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">{g.name}</h3>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {g.items.map((item) => {
                const on = picked.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(item.id)}
                      className={`tap relative block w-full overflow-hidden rounded-xl border-2 text-left ${on ? "border-primary" : "border-border"}`}
                    >
                      <ItemPhoto photoId={item.photoId} cutout={item.photoCutout} name={item.name} className="aspect-square w-full" />
                      {on && (
                        <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check size={16} strokeWidth={3} aria-hidden="true" />
                        </span>
                      )}
                      <span className="block truncate px-2 py-1 text-xs text-foreground">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Notes (optional)</span>
        <textarea name="notes" rows={2} maxLength={500} defaultValue={outfit?.notes ?? ""} className={FIELD} />
      </label>

      {state && !state.ok && state !== dismissed && <p className="text-sm text-critical">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <SheepSpinner size={20} />
            Saving…
          </span>
        ) : outfit ? (
          "Save changes"
        ) : (
          "Add outfit"
        )}
      </button>
    </form>
  );
}
