"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import type { Period } from "@/lib/data/periods";
import type { Category } from "@/lib/data/categories";
import type { CategoryDto } from "@/lib/actions/categories";
import { createExpenseFromForm, type CreateExpenseFormState } from "@/lib/actions/expenses";
import { CategoryGrid } from "@/components/expenses/CategoryGrid";
import { formatCurrency, formatDate, parseAmount, toDateInputValue } from "@/lib/format";

type ExpenseEntryFormProps = {
  period: Period;
  categories: Category[];
  defaultCategoryId: string | null;
};

type DateChoice = "today" | "yesterday" | "other";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-primary px-4 py-3.5 text-base font-semibold text-primary-foreground shadow-md disabled:opacity-60 sm:shadow-none"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function shiftDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return toDateInputValue(new Date(y, m - 1, d + days));
}

export function ExpenseEntryForm({
  period,
  categories: initialCategories,
  defaultCategoryId,
}: ExpenseEntryFormProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(defaultCategoryId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [otherDate, setOtherDate] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Local "today" is read in the browser only (server snapshot is empty) so
  // server and browser timezones can never cause a hydration mismatch.
  const today = useSyncExternalStore(
    () => () => {},
    () => toDateInputValue(),
    () => ""
  );
  const date =
    dateChoice === "today"
      ? today
      : dateChoice === "yesterday"
        ? today && shiftDays(today, -1)
        : (otherDate ?? today);

  const [state, formAction] = useActionState(
    async (prev: CreateExpenseFormState, formData: FormData) => {
      const result = await createExpenseFromForm(prev, formData);
      if (result?.ok) {
        const category = categories.find((c) => c.id === selectedCategoryId);
        const parsed = parseAmount(amount);
        setSavedMessage(
          `Saved ${parsed !== null ? formatCurrency(parsed) : ""}${category ? ` · ${category.name}` : ""}`
        );
        setAmount("");
        setNote("");
        setShowNote(false);
        amountRef.current?.focus();
      } else {
        setSavedMessage(null);
      }
      return result;
    },
    null
  );

  // Desktop: jump straight into the amount field. Phones: don't, so the
  // keyboard doesn't cover the category grid on arrival.
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) amountRef.current?.focus();
  }, []);

  function appendPlus() {
    setAmount((prev) => (prev.trim() === "" || prev.trim().endsWith("+") ? prev : `${prev.trim()}+`));
    amountRef.current?.focus();
  }

  function handleCreatedCategory(category: CategoryDto) {
    setCategories((prev) => [
      ...prev,
      { ...category, sortOrder: prev.length * 10 + 10, expenseCount: 0, lastUsedAt: null },
    ]);
    setSelectedCategoryId(category.id);
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const parsedAmount = parseAmount(amount);
  const isSum = amount.includes("+");

  const segment = (choice: DateChoice, label: string) => (
    <button
      type="button"
      onClick={() => setDateChoice(choice)}
      aria-pressed={dateChoice === choice}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
        dateChoice === choice ? "bg-surface text-foreground shadow-sm" : "text-ink-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="categoryId" value={selectedCategoryId ?? ""} />
      <input type="hidden" name="periodType" value={period.type} />
      <input type="hidden" name="periodId" value={period.id} />
      <input type="hidden" name="date" value={date} />

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm text-ink-muted">
          Amount
        </label>
        <div className="flex gap-2">
          <input
            id="amount"
            ref={amountRef}
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setSavedMessage(null);
            }}
            placeholder="0,00"
            required
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 font-mono text-3xl font-semibold tabular-nums text-foreground"
          />
          <button
            type="button"
            onClick={appendPlus}
            aria-label="Add another amount"
            title="Add another amount (sum)"
            className="w-16 shrink-0 rounded-xl border border-border bg-surface-muted text-3xl font-light text-foreground"
          >
            +
          </button>
        </div>
        <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
          {isSum && parsedAmount !== null ? (
            `= ${formatCurrency(parsedAmount)}`
          ) : savedMessage ? (
            <span className="text-positive-text">✓ {savedMessage}</span>
          ) : (
            "Tap + to add several purchases together."
          )}
        </p>
      </div>

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
            className="py-1 text-sm text-primary"
          >
            Edit
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
        <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
          {segment("today", "Today")}
          {segment("yesterday", "Yesterday")}
          {segment("other", dateChoice === "other" && date ? formatDate(date) : "Other…")}
        </div>
        {dateChoice === "other" && (
          <input
            type="date"
            value={date}
            max={today || undefined}
            onChange={(e) => setOtherDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
          />
        )}
      </div>

      {showNote ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Note</span>
          <input
            name="note"
            type="text"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. birthday dinner"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="self-start py-1 text-sm text-primary"
        >
          + Add note
        </button>
      )}

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      {/* Sticky on phones so it stays reachable above the tab bar. */}
      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 sm:static">
        <SubmitButton
          label={
            parsedAmount !== null && parsedAmount > 0
              ? `Save ${formatCurrency(parsedAmount)}`
              : "Save expense"
          }
        />
      </div>
    </form>
  );
}
