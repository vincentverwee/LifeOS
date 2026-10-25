"use client";

import { useState, useTransition } from "react";
import { createCategory, type CategoryDto } from "@/lib/actions/categories";
import type { CategoryColorSlot } from "@/lib/categoryPalette";

type CategoryGridProps = {
  categories: { id: string; name: string; color: CategoryColorSlot }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (category: CategoryDto) => void;
};

/** Every active category as a big tap target, in the user's own order. */
export function CategoryGrid({ categories, selectedId, onSelect, onCreated }: CategoryGridProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await createCategory({ name: trimmed });
      if (result.ok) {
        onCreated(result.category);
        setName("");
        setAdding(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Category" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {categories.map((category) => {
          const selected = category.id === selectedId;
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(category.id)}
              className={`btn flex min-h-14 justify-start gap-2.5 rounded-2xl border-2 px-4 py-2 text-left text-sm ${
                selected
                  ? "border-primary bg-surface-muted text-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-muted active:bg-surface-muted"
              }`}
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--color-tag-${category.color})` }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 leading-tight">{category.name}</span>
              {selected && (
                <span className="text-primary" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn flex min-h-14 rounded-2xl border-2 border-dashed border-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-muted active:bg-surface-muted"
          >
            + New
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="New category name"
            className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={create}
            disabled={!name.trim() || isPending}
            className="btn btn-primary px-4 py-2 text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="btn btn-outline px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
