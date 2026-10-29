"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ListExpense } from "@/lib/data/expenses";
import { deleteExpense, updateExpense } from "@/lib/actions/expenses";
import { formatCurrency, parseAmount } from "@/lib/format";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { PubPicker, suggestedPints } from "@/components/beer/PubPicker";
import type { PubChoice, PubOption } from "@/lib/beer/types";

type CategoryOption = { id: string; name: string; isArchived?: boolean; pintPrice: number | null };

type ExpenseListProps = {
  expenses: ListExpense[];
  categories: CategoryOption[];
  pubs: PubOption[];
};

/** "Sult · 2 pints" under a beer. */
function beerLine(expense: ListExpense): string | null {
  const unit = expense.sizeMl ? `× ${expense.sizeMl / 10} cl` : expense.pints === 1 ? "pint" : "pints";
  const parts = [expense.pubName, expense.pints ? `${expense.pints} ${unit}` : null];
  return parts.filter(Boolean).join(" · ") || null;
}

const dayFormatter = new Intl.DateTimeFormat("nl-BE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function ExpenseList({ expenses, categories, pubs }: ExpenseListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (expenses.length === 0) {
    return <p className="text-sm text-ink-muted">Nothing logged yet.</p>;
  }

  function remove(expense: ListExpense) {
    if (!window.confirm(`Delete ${formatCurrency(expense.amount)} · ${expense.categoryName}?`)) return;
    setError(null);
    setNotice(null);
    setDeletingId(expense.id);
    startTransition(async () => {
      const result = await deleteExpense(expense.id);
      // On success the action already re-rendered this page; on failure the list may be stale.
      if (!result.ok) {
        setError(result.error);
        router.refresh();
      }
      setDeletingId(null);
    });
  }

  // Group by day (newest first, as the list is already sorted), with a day total.
  const days: { date: string; total: number; items: ListExpense[] }[] = [];
  for (const expense of expenses) {
    const last = days.at(-1);
    if (last && last.date === expense.date) {
      last.items.push(expense);
      last.total += expense.amount;
    } else {
      days.push({ date: expense.date, total: expense.amount, items: [expense] });
    }
  }

  const iconButton =
    "btn flex h-11 w-11 shrink-0 text-ink-muted hover:bg-surface-muted hover:text-foreground active:bg-surface-muted";

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-critical">{error}</p>}
      {notice && <p className="text-sm text-positive-text">{notice}</p>}
      {days.map((day) => (
        <section key={day.date} id={`day-${day.date}`} className="flex scroll-mt-4 flex-col gap-1.5">
          <div className="flex items-baseline justify-between px-1 text-sm">
            <span className="font-medium capitalize text-foreground">
              {dayFormatter.format(new Date(`${day.date}T00:00:00Z`))}
            </span>
            <span className="font-mono tabular-nums text-ink-muted">{formatCurrency(day.total)}</span>
          </div>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {day.items.map((expense) => (
              <li key={expense.id} className="border-b border-border last:border-b-0">
                {editingId === expense.id ? (
                  <div className="p-3">
                    <EditRow
                      expense={expense}
                      categories={categories}
                      pubs={pubs}
                      onDone={(movedTo) => {
                        setEditingId(null);
                        setNotice(movedTo ? `Moved to ${movedTo}.` : null);
                      }}
                      onDelete={() => remove(expense)}
                    />
                  </div>
                ) : (
                  <div
                    className={`flex min-h-14 items-center gap-1 py-1.5 pr-1.5 pl-3 ${
                      deletingId === expense.id ? "opacity-50" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEditingId(expense.id)}
                      className="tap -ml-2 flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl py-1 pr-2 pl-2 text-left"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: `var(--color-tag-${expense.categoryColor})` }}
                          aria-hidden="true"
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">
                            {expense.categoryName}
                            {expense.fromSubscription && (
                              <span className="ml-1 text-ink-muted" title="Subscription" aria-label="(subscription)">
                                ↻
                              </span>
                            )}
                          </span>
                          {(expense.note || beerLine(expense)) && (
                            <span className="truncate text-xs text-ink-muted">
                              {[beerLine(expense), expense.note].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                        {formatCurrency(expense.amount)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(expense.id)}
                      aria-label={`Edit ${expense.categoryName} ${formatCurrency(expense.amount)}`}
                      className={iconButton}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(expense)}
                      disabled={deletingId === expense.id}
                      aria-label={`Delete ${expense.categoryName} ${formatCurrency(expense.amount)}`}
                      className={`${iconButton} hover:!text-critical`}
                    >
                      {deletingId === expense.id ? <SheepSpinner size={20} /> : <TrashIcon />}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EditRow({
  expense,
  categories,
  pubs,
  onDone,
  onDelete,
}: {
  expense: ListExpense;
  categories: CategoryOption[];
  pubs: PubOption[];
  onDone: (movedTo?: string | null) => void;
  onDelete: () => void;
}) {
  const [amount, setAmount] = useState(String(expense.amount).replace(".", ","));
  const [date, setDate] = useState(expense.date);
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [note, setNote] = useState(expense.note ?? "");
  // Beer: sent only when changed here, so the stored pub and pints stay otherwise.
  const [pubName, setPubName] = useState(expense.pubName ?? "");
  const [pub, setPub] = useState<PubChoice | null | undefined>(undefined);
  const [pintsPicked, setPintsPicked] = useState<number | null>(null);
  const [sizePicked, setSizePicked] = useState<number | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Archived categories stay selectable only for the expense that already uses one.
  const options = categories.filter((c) => !c.isArchived || c.id === expense.categoryId);
  const pintPrice = categories.find((c) => c.id === categoryId)?.pintPrice ?? null;
  const pickedPub = pub === undefined ? (expense.pubId ? pubs.find((p) => p.id === expense.pubId) : undefined) : pub?.kind === "known" ? pubs.find((p) => p.id === pub.id) : undefined;
  // A new amount re-guesses the pints (the stored number may have been the old guess); a tap wins.
  const parsedAmount = parseAmount(amount);
  const amountChanged = parsedAmount !== null && parsedAmount !== expense.amount;
  const sizeMl = sizePicked === undefined ? expense.sizeMl : sizePicked;
  const guess = pintPrice !== null ? suggestedPints(parsedAmount, pintPrice, pickedPub, sizeMl) : null;
  const pints = pintsPicked ?? (amountChanged ? guess : (expense.pints ?? guess));

  function save() {
    const parsed = parseAmount(amount);
    if (parsed === null || parsed < 0 || (parsed === 0 && (pintPrice === null || !pints))) {
      setError(parsed === 0 ? "A free beer needs a beer category." : "Enter a valid amount.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateExpense({
        id: expense.id,
        categoryId,
        amount: parsed,
        date,
        note,
        pub,
        pints: pintsPicked ?? (amountChanged ? guess : undefined),
        sizeMl: sizePicked,
      });
      if (result.ok) {
        onDone(result.movedTo);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Amount</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 font-mono tabular-nums text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Date</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-muted">Category</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isArchived ? " (archived)" : ""}
            </option>
          ))}
        </select>
      </label>
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
          onSize={setSizePicked}
        />
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-muted">Note</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
      </label>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="btn btn-primary inline-flex px-5 py-2.5 text-sm"
        >
          {isPending && <SheepSpinner size={18} />}
          Save
        </button>
        <button
          type="button"
          onClick={() => onDone()}
          className="btn btn-outline px-5 py-2.5 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="btn btn-danger ml-auto inline-flex gap-1.5 px-4 py-2.5 text-sm"
        >
          <TrashIcon />
          Delete
        </button>
      </div>
    </div>
  );
}
