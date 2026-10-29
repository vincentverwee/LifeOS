"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import type { Period } from "@/lib/data/periods";
import type { Category } from "@/lib/data/categories";
import type { CategoryDto } from "@/lib/actions/categories";
import { createExpenseFromForm, type CreateExpenseFormState } from "@/lib/actions/expenses";
import { CategoryGrid } from "@/components/expenses/CategoryGrid";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { MAX_AMOUNT, formatCurrency, formatDate, hasOperator, parseAmount, toDateInputValue } from "@/lib/format";
import { addToOutbox, newClientId, onlineStore, setSyncFailed } from "@/lib/offline/outbox";
import { PubPicker, suggestedPints } from "@/components/beer/PubPicker";
import type { PubChoice, PubOption } from "@/lib/beer/types";

const OPERATORS = [
  { op: "+", label: "Plus" },
  { op: "−", label: "Minus" },
  { op: "×", label: "Times" },
  { op: "÷", label: "Divide by" },
];

/** mousedown handler that keeps focus where it is (in the amount field). */
function keepFocus(e: MouseEvent) {
  e.preventDefault();
}

type ExpenseEntryFormProps = {
  period: Period;
  categories: Category[];
  defaultCategoryId: string | null;
  /** your pubs, for the pub picker on beer categories */
  pubs: PubOption[];
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
  pubs,
}: ExpenseEntryFormProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(defaultCategoryId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [otherDate, setOtherDate] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [opsOpen, setOpsOpen] = useState(false);
  // Beer only. The pub stays after a save (the next round is usually at the same one).
  const [pubName, setPubName] = useState("");
  const [pub, setPub] = useState<PubChoice | null>(null);
  const [pintsPicked, setPintsPicked] = useState<number | null>(null);
  const [sizeMl, setSizeMl] = useState<number | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const opsRef = useRef<HTMLDivElement>(null);

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

  const online = useSyncExternalStore(...onlineStore);

  function resetAfterSave(message: string) {
    setSavedMessage(message);
    setAmount("");
    setNote("");
    setShowNote(false);
    setPintsPicked(null);
    amountRef.current?.focus();
  }

  const [state, formAction] = useActionState(
    async (prev: CreateExpenseFormState, formData: FormData): Promise<CreateExpenseFormState> => {
      // A fresh id per entry: the expense's id on the server, so a retry from the
      // offline queue can't save it twice (even if this attempt did get through).
      const clientId = newClientId();
      formData.set("clientId", clientId);
      const category = categories.find((c) => c.id === selectedCategoryId);
      const parsed = parseAmount(amount);
      const beerPub = category?.pintPrice != null ? pub : null;
      const label =
        `${parsed !== null ? formatCurrency(parsed) : ""}${category ? ` · ${category.name}` : ""}` +
        (beerPub && pubName.trim() ? ` at ${pubName.trim()}` : "");

      let result: CreateExpenseFormState | undefined;
      let failedOnline = false;
      if (navigator.onLine) {
        try {
          result = await createExpenseFromForm(prev, formData);
        } catch {
          // No answer (connection dropped, server down, logged out, an older build):
          // keep it on the phone below.
          failedOnline = true;
        }
      }

      if (result === undefined) {
        if (!category) return { ok: false, error: "Pick a category first." };
        if (parsed === null || parsed < 0 || (parsed === 0 && (category.pintPrice == null || !pints))) {
          return { ok: false, error: "Enter a valid amount, e.g. 6,80 or 6,8+7,4." };
        }
        if (parsed > MAX_AMOUNT) return { ok: false, error: "That amount is too large." };
        addToOutbox({
          id: clientId,
          categoryId: category.id,
          categoryName: category.name,
          amount: parsed,
          date: date || toDateInputValue(),
          period: { type: period.type, id: period.id },
          note: note.trim() || null,
          pub: beerPub,
          pints: category.pintPrice != null ? pints : null,
          sizeMl: category.pintPrice != null ? sizeMl : null,
          createdAt: new Date().toISOString(),
        });
        if (failedOnline) setSyncFailed(true);
        resetAfterSave(
          failedOnline
            ? `Couldn't reach the server: kept ${label} on this phone, will retry`
            : `Saved on this phone ${label} · syncs when online`
        );
        return null;
      }

      if (result?.ok) {
        resetAfterSave(`Saved ${label}` + (result.movedTo ? ` · in ${result.movedTo}` : ""));
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

  // "Log a beer" from /beer links to /budget/add#beer: start on the (first) beer category.
  // A hash, not a query, so the offline copy of /budget/add still serves it.
  const beerHashApplied = useRef(false);
  useEffect(() => {
    if (beerHashApplied.current) return;
    beerHashApplied.current = true;
    if (window.location.hash !== "#beer") return;
    const beer = initialCategories.find((c) => c.pintPrice !== null);
    if (beer) setSelectedCategoryId(beer.id);
  }, [initialCategories]);

  // Close the operator picker on a tap outside it or Escape.
  useEffect(() => {
    if (!opsOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!opsRef.current?.contains(e.target as Node)) setOpsOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [opsOpen]);

  function appendOperator(op: string) {
    setAmount((prev) => {
      const trimmed = prev.trim();
      if (trimmed === "") return prev;
      // A second operator in a row replaces the first ("12+" then × → "12×").
      return /[+\-−*×/÷xX]$/.test(trimmed) ? `${trimmed.slice(0, -1)}${op}` : `${trimmed}${op}`;
    });
    setSavedMessage(null);
    setOpsOpen(false);
    amountRef.current?.focus();
  }

  function toggleOperators() {
    setOpsOpen((open) => !open);
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
  const isCalculation = hasOperator(amount);
  const pintPrice = selectedCategory?.pintPrice ?? null;
  // Shown and saved: the tapped number, else the guess from the pub's or the category's price.
  const pints =
    pintPrice === null
      ? null
      : (pintsPicked ??
        suggestedPints(parsedAmount, pintPrice, pub?.kind === "known" ? pubs.find((p) => p.id === pub.id) : undefined, sizeMl));

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
      {pintPrice !== null && (
        <>
          <input type="hidden" name="pub" value={pub ? JSON.stringify(pub) : ""} />
          <input type="hidden" name="pints" value={pints ?? ""} />
          <input type="hidden" name="sizeMl" value={sizeMl ?? ""} />
        </>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm text-ink-muted">
          Amount
        </label>
        <div className="flex gap-2">
          {/* The calculation is typed in the input; its total shows inside the same box. */}
          <div className="flex min-w-0 flex-1 flex-col justify-center rounded-2xl border border-border bg-surface px-4 py-2 focus-within:ring-2 focus-within:ring-ring">
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
              className={`w-full bg-transparent py-1 font-mono font-semibold tabular-nums text-foreground outline-none ${
                isCalculation ? "text-2xl" : "text-3xl"
              }`}
            />
            {isCalculation && (
              <span className="animate-fade-in text-right text-lg font-semibold tabular-nums text-ink-muted" aria-live="polite">
                {parsedAmount !== null ? `= ${formatCurrency(parsedAmount)}` : "= …"}
              </span>
            )}
          </div>
          <div ref={opsRef} className="relative flex shrink-0">
            <button
              type="button"
              // The operator buttons never take focus from the amount field, so the phone
              // keyboard stays up. Desktop: cancelling mousedown keeps focus. Touch: iOS moves
              // focus on the synthesised mouse events, so the tap is handled on touchend and its
              // default (those events + the click) cancelled.
              onMouseDown={keepFocus}
              onTouchEnd={(e) => {
                e.preventDefault();
                toggleOperators();
              }}
              onClick={toggleOperators}
              aria-label="Calculate"
              aria-haspopup="true"
              aria-expanded={opsOpen}
              title="Add, subtract, multiply or divide"
              className={`btn flex w-16 rounded-2xl border border-border text-foreground hover:bg-gridline active:bg-gridline ${
                opsOpen ? "bg-gridline" : "bg-surface-muted"
              }`}
            >
              <Plus size={28} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {opsOpen && (
              <div
                role="group"
                aria-label="Operators"
                className="animate-pop-in absolute right-0 top-[calc(100%+0.5rem)] z-40 grid w-max origin-top-right grid-cols-2 gap-2 rounded-3xl border border-border bg-surface p-2 shadow-lg"
              >
                {OPERATORS.map(({ op, label }) => (
                  <button
                    key={op}
                    type="button"
                    onMouseDown={keepFocus}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      appendOperator(op);
                    }}
                    onClick={() => appendOperator(op)}
                    aria-label={label}
                    className="btn flex h-16 w-16 rounded-2xl bg-surface-muted text-3xl font-semibold text-foreground hover:bg-gridline active:bg-gridline"
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
          {savedMessage ? (
            <span className="text-positive-text">✓ {savedMessage}</span>
          ) : !online ? (
            <span className="text-warning-text">Offline: expenses are kept on this phone until you&apos;re back online.</span>
          ) : (
            "Tap + to add, subtract, multiply or divide."
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

      {pintPrice !== null && (
        <PubPicker
          pubs={pubs}
          name={pubName}
          onPick={(name, choice) => {
            setPubName(name);
            setPub(choice);
          }}
          pints={pints}
          onPints={setPintsPicked}
          sizeMl={sizeMl}
          onSize={setSizeMl}
        />
      )}

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
