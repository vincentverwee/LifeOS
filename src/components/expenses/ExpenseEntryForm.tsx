"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import type { Period } from "@/lib/data/periods";
import type { Category } from "@/lib/data/categories";
import type { CategoryDto } from "@/lib/actions/categories";
import { createExpenseFromForm, type CreateExpenseFormState } from "@/lib/actions/expenses";
import { CategoryGrid } from "@/components/expenses/CategoryGrid";
import { toDateInputValue } from "@/lib/format";

type ExpenseEntryFormProps = {
  period: Period;
  categories: Category[];
  defaultCategoryId: string | null;
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
  defaultCategoryId,
}: ExpenseEntryFormProps) {
  const [state, formAction] = useActionState(createExpenseFromForm, initialState);
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(defaultCategoryId);
  // Local "today" is read in the browser only (server snapshot is empty) so
  // server and browser timezones can never cause a hydration mismatch.
  const today = useSyncExternalStore(
    () => () => {},
    () => toDateInputValue(),
    () => ""
  );
  const [pickedDate, setDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const [showNote, setShowNote] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const lastResultRef = useRef(state);

  useEffect(() => {
    if (state && state !== lastResultRef.current && state.ok) {
      lastResultRef.current = state;
      if (amountRef.current) amountRef.current.value = "";
      if (noteRef.current) noteRef.current.value = "";
      amountRef.current?.focus();
    } else {
      lastResultRef.current = state;
    }
  }, [state]);

  function handleCreatedCategory(category: CategoryDto) {
    setCategories((prev) => [
      ...prev,
      { ...category, sortOrder: prev.length * 10 + 10, expenseCount: 0, lastUsedAt: null },
    ]);
    setSelectedCategoryId(category.id);
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="categoryId" value={selectedCategoryId ?? ""} />
      <input type="hidden" name="periodType" value={period.type} />
      <input type="hidden" name="periodId" value={period.id} />

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Amount</span>
        <input
          ref={amountRef}
          name="amount"
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="0,00 — or sum like 6,8+7,4"
          required
          className="rounded-xl border border-border bg-surface px-4 py-4 text-3xl font-semibold text-foreground"
        />
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">
            Category{selectedCategory ? ` — ${selectedCategory.name}` : ""}
          </span>
          <button
            type="button"
            onClick={() => {
              const section = document.getElementById("categories") as HTMLDetailsElement | null;
              if (!section) return;
              section.open = true;
              section.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="text-sm text-primary"
          >
            Edit categories
          </button>
        </div>
        <CategoryGrid
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          onCreated={handleCreatedCategory}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Date</span>
        <div className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="date" value={date} />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => setDate(null)}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-ink-muted"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setDate(toDateInputValue(d));
            }}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-ink-muted"
          >
            Yesterday
          </button>
        </div>
      </div>

      {showNote ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Note</span>
          <input
            ref={noteRef}
            name="note"
            type="text"
            autoFocus
            placeholder="e.g. birthday dinner"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="self-start text-sm text-primary"
        >
          + Add note
        </button>
      )}

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
