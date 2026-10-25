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
      // The action re-renders the page itself; refresh only to drop a stale list on failure.
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        router.refresh();
      }
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

      {/* Tap a row to open its editor; all actions live there as full-size buttons. */}
      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        {categories.map((category, index) => (
          <li
            key={category.id}
            className={`border-b border-border last:border-b-0 ${
              category.isArchived ? "opacity-60" : ""
            }`}
          >
            {editingId === category.id ? (
              <div className="p-3">
                <CategoryEditRow
                  category={category}
                  canMoveUp={index > 0}
                  canMoveDown={index < categories.length - 1}
                  busy={isPending}
                  onMove={(direction) => move(index, direction)}
                  onArchiveToggle={() =>
                    run(() =>
                      setCategoryArchived({ id: category.id, archived: !category.isArchived })
                    )
                  }
                  onDelete={() => {
                    setEditingId(null);
                    run(() => deleteCategory({ id: category.id }));
                  }}
                  onSave={(name, color, pintPrice) => {
                    setEditingId(null);
                    run(() => updateCategory({ id: category.id, name, color, pintPrice }));
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingId(category.id)}
                className="tap flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--color-tag-${category.color})` }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-foreground">
                    {category.name}
                  </span>
                  {category.pintPrice !== null && (
                    <span className="shrink-0 text-xs text-ink-muted">
                      🍺 {formatCurrency(category.pintPrice)}
                    </span>
                  )}
                  {category.isArchived && (
                    <span className="shrink-0 text-xs text-ink-muted">archived</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-ink-muted">
                  {category.expenseCount}×<span aria-hidden="true">›</span>
                </span>
              </button>
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
    <div className="flex flex-wrap gap-3">
      {CATEGORY_COLOR_SLOTS.map((slot) => (
        <button
          key={slot}
          type="button"
          aria-label={slot}
          aria-pressed={value === slot}
          onClick={() => onChange(slot)}
          className={`btn h-8 w-8 ${
            value === slot ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""
          }`}
          style={{ backgroundColor: `var(--color-tag-${slot})` }}
        />
      ))}
    </div>
  );
}

function CategoryCreateForm({
  onCreate,
}: {
  onCreate: (name: string, color: CategoryColorSlot) => void;
}) {
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
          enterKeyHint="done"
          placeholder="New category"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="btn btn-primary px-5 py-2.5 text-sm"
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
  canMoveUp,
  canMoveDown,
  busy,
  onMove,
  onArchiveToggle,
  onDelete,
  onSave,
  onCancel,
}: {
  category: Category;
  canMoveUp: boolean;
  canMoveDown: boolean;
  busy: boolean;
  onMove: (direction: -1 | 1) => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onSave: (name: string, color: CategoryColorSlot, pintPrice: number | null) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState<CategoryColorSlot>(category.color);
  const [pint, setPint] = useState(category.pintPrice !== null ? String(category.pintPrice) : "");
  const pintValue = pint.trim() ? parseAmount(pint) : null;
  const pintInvalid = pint.trim() !== "" && (pintValue === null || pintValue <= 0);
  const secondary =
    "btn btn-outline px-4 py-2.5 text-sm";

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Name"
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
      />
      <ColorDots value={color} onChange={setColor} />
      <label className="flex items-center justify-between gap-2 text-sm text-ink-muted">
        🍺 Pint price (empty = not beer)
        <input
          type="text"
          inputMode="decimal"
          value={pint}
          onChange={(e) => setPint(e.target.value)}
          placeholder="none"
          className={`w-24 rounded-lg border bg-surface px-2 py-2 text-foreground ${
            pintInvalid ? "border-critical" : "border-border"
          }`}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp || busy} className={secondary}>
          ▲ Move up
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown || busy} className={secondary}>
          ▼ Move down
        </button>
        <button type="button" onClick={onArchiveToggle} disabled={busy} className={secondary}>
          {category.isArchived ? "Unarchive" : "Archive"}
        </button>
        <button
          type="button"
          onClick={() => window.confirm(`Delete "${category.name}"?`) && onDelete()}
          disabled={category.expenseCount > 0 || busy}
          className="btn btn-danger px-4 py-2.5 text-sm"
        >
          Delete
        </button>
      </div>
      {category.expenseCount > 0 && (
        <p className="text-xs text-ink-muted">
          Used by {category.expenseCount} expenses, so it can be archived but not deleted.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pintInvalid || !name.trim()}
          onClick={() => onSave(name.trim(), color, pintValue)}
          className="btn btn-primary flex-1 px-4 py-2.5 text-sm"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline flex-1 px-4 py-2.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
