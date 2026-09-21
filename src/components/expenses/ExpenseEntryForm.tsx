"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Period } from "@/lib/data/periods";
import type { CategoryUsageStat } from "@/lib/data/categories";
import type { Tag } from "@/lib/data/tags";
import { createExpenseFromForm, type CreateExpenseFormState } from "@/lib/actions/expenses";
import { CategoryChipRow } from "@/components/expenses/CategoryChipRow";
import { CategoryPicker } from "@/components/expenses/CategoryPicker";
import { TagPicker } from "@/components/expenses/TagPicker";

type ExpenseEntryFormProps = {
  period: Period;
  categories: { id: string; name: string }[];
  chips: CategoryUsageStat[];
  defaultCategoryId: string | null;
  tags: Tag[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save and add another"}
    </button>
  );
}

const initialState: CreateExpenseFormState = null;

export function ExpenseEntryForm({
  period,
  categories: initialCategories,
  chips,
  defaultCategoryId,
  tags,
}: ExpenseEntryFormProps) {
  const [state, formAction] = useActionState(createExpenseFromForm, initialState);
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(defaultCategoryId);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const lastResultRef = useRef(state);

  useEffect(() => {
    if (state && state !== lastResultRef.current && state.ok) {
      lastResultRef.current = state;
      if (amountRef.current) amountRef.current.value = "";
      setSelectedTagIds([]);
      amountRef.current?.focus();
    } else {
      lastResultRef.current = state;
    }
  }, [state]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleCreatedCategory(category: { id: string; name: string }) {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedCategoryId(category.id);
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="categoryId" value={selectedCategoryId ?? ""} />

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Amount</span>
        <input
          ref={amountRef}
          name="amount"
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          required
          className="rounded-xl border border-border bg-surface px-4 py-4 text-3xl font-semibold text-foreground"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">
          Category{selectedCategory ? ` — ${selectedCategory.name}` : ""}
        </span>
        {chips.length > 0 ? (
          <CategoryChipRow
            chips={chips}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onMore={() => setPickerOpen(true)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={`self-start rounded-full border px-4 py-2 text-sm font-medium ${
              selectedCategory
                ? "border-primary bg-primary text-primary-foreground"
                : "border-dashed border-border bg-surface text-ink-muted"
            }`}
          >
            {selectedCategory ? selectedCategory.name : "Pick a category…"}
          </button>
        )}
        {pickerOpen && (
          <CategoryPicker
            categories={categories}
            selectedId={selectedCategoryId}
            periodType={period.type}
            periodId={period.id}
            onSelect={setSelectedCategoryId}
            onCreated={handleCreatedCategory}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      <TagPicker tags={tags} selectedIds={selectedTagIds} onToggle={toggleTag} />
      {selectedTagIds.map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
