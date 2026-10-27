"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import type { Period } from "@/lib/data/periods";
import type { Category } from "@/lib/data/categories";
import type { CategoryDto } from "@/lib/actions/categories";
import { createExpenseFromForm, type CreateExpenseFormState } from "@/lib/actions/expenses";
import { CategoryGrid } from "@/components/expenses/CategoryGrid";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
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
      className="btn btn-primary flex w-full px-4 py-3.5 text-base font-semibold shadow-md sm:shadow-none"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SheepSpinner size={20} />
          Saving…
        </span>
      ) : (
        label
      )}
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
          `Saved ${parsed !== null ? formatCurrency(parsed) : ""}${category ? ` · ${category.name}` : ""}` +
            (result.movedTo ? ` · in ${result.movedTo}` : "")
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
      className={`btn flex min-h-11 flex-1 px-3 text-sm ${
        dateChoice === choice ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
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
            className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3 font-mono text-3xl font-semibold tabular-nums text-foreground"
          />
          <button
            type="button"
            onClick={appendPlus}
            aria-label="Add another amount"
            title="Add another amount (sum)"
            className="btn flex w-16 shrink-0 rounded-2xl border border-border bg-surface-muted text-foreground hover:bg-gridline active:bg-gridline"
          >
            <Plus size={28} strokeWidth={1.8} aria-hidden="true" />
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
            className="btn btn-ghost -mr-3 inline-flex min-h-11 px-3 text-sm"
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
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
          {segment("today", "Today")}
          {segment("yesterday", "Yesterday")}
          {segment("other", dateChoice === "other" && date ? formatDate(date) : "Other…")}
        </div>
        {dateChoice === "other" && (
          <input
            type="date"
            value={date}
            min={period.type === "trip" ? period.startDate.slice(0, 10) : undefined}
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
          className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm"
        >
          + Add note
        </button>
      )}

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      {/* Sticky on phones so it stays reachable above the tab bar; the backing strip keeps
          fields scrolling underneath from showing around the button. */}
      <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 -mx-4 bg-background/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
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
