"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
  type CategoryResult,
} from "@/lib/actions/wardrobe";

type Category = { id: string; name: string; itemCount: number };

const FIELD = "min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

/** Wardrobe categories: add at the top, tap one to rename, move or delete it. */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<CategoryResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onOk?.();
      else {
        setError(result.error);
        router.refresh();
      }
    });
  }

  function add() {
    const name = newName.trim();
    if (!name) return;
    run(() => createCategory(name), () => setNewName(""));
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...categories];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    run(() => reorderCategories(next.map((c) => c.id)));
  }

  function remove(category: Category) {
    const what =
      category.itemCount === 0
        ? `Delete "${category.name}"?`
        : `Delete "${category.name}"? Its ${category.itemCount} ${category.itemCount === 1 ? "item stays" : "items stay"}, without a category.`;
    if (!window.confirm(what)) return;
    run(() => deleteCategory(category.id), () => setEditingId(null));
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={40}
          enterKeyHint="done"
          placeholder="New category, e.g. Sportswear"
          aria-label="New category"
          className={FIELD}
        />
        <button type="submit" disabled={!newName.trim() || pending} className="btn btn-primary min-h-11 px-5 text-sm">
          Add
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-sm text-ink-muted">
          No categories. Everything is listed under “No category”.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {categories.map((category, index) => (
            <li key={category.id} className="border-b border-border last:border-b-0">
              {editingId === category.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = draft.trim();
                    if (!name || name === category.name) return setEditingId(null);
                    run(() => renameCategory(category.id, name), () => setEditingId(null));
                  }}
                  className="flex flex-col gap-3 p-3"
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={40}
                    aria-label="Category name"
                    enterKeyHint="done"
                    className={FIELD}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="submit" disabled={!draft.trim() || pending} className="btn btn-primary min-h-11 px-4 text-sm">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn btn-outline min-h-11 px-4 text-sm">
                      Cancel
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(category)} disabled={pending} className="btn btn-danger min-h-11 px-4 text-sm">
                    Delete category
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1 py-1 pr-1 pl-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(category.name);
                      setEditingId(category.id);
                      setError(null);
                    }}
                    className="tap flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl pr-2 text-left"
                  >
                    <span className="truncate font-medium text-foreground">{category.name}</span>
                    <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                      {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || pending}
                    aria-label={`Move ${category.name} up`}
                    className="btn btn-ghost flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-30"
                  >
                    <ChevronUp size={20} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === categories.length - 1 || pending}
                    aria-label={`Move ${category.name} down`}
                    className="btn btn-ghost flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-30"
                  >
                    <ChevronDown size={20} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
      <p className="text-sm text-ink-muted">Tap a category to rename or delete it. The order here is the order everywhere.</p>
    </div>
  );
}
