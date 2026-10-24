"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Category } from "@/lib/data/categories";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  setCategoryArchived,
  updateCategory,
} from "@/lib/actions/categories";
import { CATEGORY_COLOR_SLOTS, type CategoryColorSlot } from "@/lib/categoryPalette";
import { formatCurrency, parseAmount } from "@/lib/format";
import { CategoryChip } from "@/components/categories/CategoryChip";

type CategoryManagerProps = {
  categories: Category[];
};

export function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error ?? "Something went wrong.");
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    run(() => reorderCategories({ orderedIds: next.map((c) => c.id) }));
  }

  return (
    <div className="flex flex-col gap-3">
      <CategoryCreateForm onCreate={(name, color) => run(() => createCategory({ name, color }))} />

      <ul className="flex flex-col gap-2">
        {categories.map((category, index) => (
          <li
            key={category.id}
            className={`rounded-xl border border-border bg-surface p-3 ${
              category.isArchived ? "opacity-60" : ""
            }`}
          >
            {editingId === category.id ? (
              <CategoryEditRow
                category={category}
                onSave={(name, color, pintPrice) => {
                  setEditingId(null);
                  run(() => updateCategory({ id: category.id, name, color, pintPrice }));
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CategoryChip name={category.name} color={category.color} />
                  {category.pintPrice !== null && (
                    <span className="text-xs text-ink-muted">
                      🍺 {formatCurrency(category.pintPrice)}/pint
                    </span>
                  )}
                  <span className="text-xs text-ink-muted">{category.expenseCount}×</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || isPending}
                    aria-label="Move up"
                    className="px-1 text-ink-muted disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === categories.length - 1 || isPending}
                    aria-label="Move down"
                    className="px-1 text-ink-muted disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button type="button" onClick={() => setEditingId(category.id)} className="px-2 text-primary">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      run(() => setCategoryArchived({ id: category.id, archived: !category.isArchived }))
                    }
                    className="px-2 text-ink-muted"
                  >
                    {category.isArchived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => deleteCategory({ id: category.id }))}
                    disabled={category.expenseCount > 0 || isPending}
                    title={category.expenseCount > 0 ? "Has expenses — archive instead" : "Delete"}
                    className="px-2 text-critical disabled:opacity-30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}

function ColorDots({
  value,
  onChange,
}: {
  value: CategoryColorSlot;
  onChange: (slot: CategoryColorSlot) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_COLOR_SLOTS.map((slot) => (
        <button
          key={slot}
          type="button"
          aria-label={slot}
          onClick={() => onChange(slot)}
          className={`h-6 w-6 rounded-full ${
            value === slot ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""
          }`}
          style={{ backgroundColor: `var(--color-tag-${slot})` }}
        />
      ))}
    </div>
  );
}

function CategoryCreateForm({ onCreate }: { onCreate: (name: string, color: CategoryColorSlot) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<CategoryColorSlot>(CATEGORY_COLOR_SLOTS[0]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color);
    setName("");
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="New category"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <div className="mt-3">
        <ColorDots value={color} onChange={setColor} />
      </div>
    </div>
  );
}

function CategoryEditRow({
  category,
  onSave,
  onCancel,
}: {
  category: Category;
  onSave: (name: string, color: CategoryColorSlot, pintPrice: number | null) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState<CategoryColorSlot>(category.color);
  const [pint, setPint] = useState(category.pintPrice !== null ? String(category.pintPrice) : "");
  const pintValue = pint.trim() ? parseAmount(pint) : null;
  const pintInvalid = pint.trim() !== "" && (pintValue === null || pintValue <= 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          disabled={pintInvalid || !name.trim()}
          onClick={() => onSave(name.trim(), color, pintValue)}
          className="rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-2 text-sm text-ink-muted"
        >
          Cancel
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        🍺 Pint price (leave empty if not beer)
        <input
          type="text"
          inputMode="decimal"
          value={pint}
          onChange={(e) => setPint(e.target.value)}
          placeholder="none"
          className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground"
        />
      </label>
      <ColorDots value={color} onChange={setColor} />
    </div>
  );
}
