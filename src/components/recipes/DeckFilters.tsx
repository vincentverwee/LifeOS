"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { CUISINES, MAX_TIMES, MEAL_TYPES, type DeckFilters as Filters } from "@/lib/recipes/types";
import { Sheet } from "./Sheet";

function summary(filters: Filters): string {
  const parts = [filters.cuisine, filters.type, filters.maxReadyTime && `≤ ${filters.maxReadyTime} min`].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All recipes";
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3.5 text-sm font-medium capitalize ${
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** Filter button + sheet. Applying writes the filters to the URL, which reloads the deck. */
export function DeckFilters({ filters }: { filters: Filters }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  function openSheet() {
    setDraft(filters);
    setOpen(true);
  }

  function apply() {
    const params = new URLSearchParams();
    if (draft.cuisine) params.set("cuisine", draft.cuisine);
    if (draft.type) params.set("type", draft.type);
    if (draft.maxReadyTime) params.set("maxTime", String(draft.maxReadyTime));
    const query = params.toString();
    setOpen(false);
    router.replace(query ? `/recipes?${query}` : "/recipes");
  }

  const active = Boolean(filters.cuisine || filters.type || filters.maxReadyTime);

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-left text-sm hover:bg-surface-muted"
      >
        <SlidersHorizontal size={18} aria-hidden="true" className={active ? "text-primary" : "text-ink-muted"} />
        <span className="flex-1 truncate font-medium capitalize text-foreground">{summary(filters)}</span>
        <span className="text-ink-muted">Filter</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen} title="Filter recipes">
        <div className="flex flex-col gap-5">
          <fieldset>
            <legend className="text-sm font-semibold text-ink-muted">Max time</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip selected={!draft.maxReadyTime} onClick={() => setDraft({ ...draft, maxReadyTime: undefined })}>
                Any
              </Chip>
              {MAX_TIMES.map((m) => (
                <Chip key={m} selected={draft.maxReadyTime === m} onClick={() => setDraft({ ...draft, maxReadyTime: m })}>
                  ≤ {m} min
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink-muted">Meal</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip selected={!draft.type} onClick={() => setDraft({ ...draft, type: undefined })}>
                Any
              </Chip>
              {MEAL_TYPES.map((t) => (
                <Chip key={t} selected={draft.type === t} onClick={() => setDraft({ ...draft, type: t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink-muted">Cuisine</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip selected={!draft.cuisine} onClick={() => setDraft({ ...draft, cuisine: undefined })}>
                Any
              </Chip>
              {CUISINES.map((c) => (
                <Chip key={c} selected={draft.cuisine === c} onClick={() => setDraft({ ...draft, cuisine: c })}>
                  {c}
                </Chip>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={apply}
            className="sticky bottom-0 min-h-12 rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            Show recipes
          </button>
        </div>
      </Sheet>
    </>
  );
}
