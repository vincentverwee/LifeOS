"use client";

import { useState, useTransition } from "react";
import { createCategory } from "@/lib/actions/categories";
import type { PeriodType } from "@/lib/data/periods";

type CategoryPickerProps = {
  categories: { id: string; name: string }[];
  selectedId: string | null;
  periodType: PeriodType;
  periodId: string;
  onSelect: (id: string) => void;
  onCreated: (category: { id: string; name: string }) => void;
  onClose: () => void;
};

export function CategoryPicker({
  categories,
  selectedId,
  periodType,
  periodId,
  onSelect,
  onCreated,
  onClose,
}: CategoryPickerProps) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const result = await createCategory({ name, periodType, periodId });
      if (result.ok) {
        onCreated(result.category);
        setNewName("");
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">All categories</p>
        <button type="button" onClick={onClose} className="text-sm text-ink-muted">
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = category.id === selectedId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                onSelect(category.id);
                onClose();
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface-muted text-foreground"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newName.trim() || isPending}
          className="rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-critical">{error}</p>}
    </div>
  );
}
