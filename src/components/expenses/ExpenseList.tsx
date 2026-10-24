"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ListExpense } from "@/lib/data/expenses";
import { deleteExpense, updateExpense } from "@/lib/actions/expenses";
import { formatCurrency, parseAmount } from "@/lib/format";

type ExpenseListProps = {
  expenses: ListExpense[];
  categories: { id: string; name: string }[];
};

const dayFormatter = new Intl.DateTimeFormat("nl-BE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function ExpenseList({ expenses, categories }: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p className="text-sm text-ink-muted">Nothing logged yet.</p>;
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

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <section key={day.date} className="flex flex-col gap-1.5">
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
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingId(expense.id)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2.5 text-left active:bg-surface-muted"
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
                        </span>
                        {expense.note && (
                          <span className="truncate text-xs text-ink-muted">{expense.note}</span>
                        )}
                      </span>
                    </span>
                    <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                      {formatCurrency(expense.amount)}
                    </span>
                  </button>
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
  onDone,
}: {
  expense: ListExpense;
  categories: { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(expense.amount).replace(".", ","));
  const [date, setDate] = useState(expense.date);
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [note, setNote] = useState(expense.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) {
      setError("Enter a valid amount.");
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
      });
      if (result.ok) {
        onDone();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (!window.confirm("Delete this expense?")) return;
    startTransition(async () => {
      const result = await deleteExpense(expense.id);
      if (result.ok) {
        onDone();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 font-mono tabular-nums text-foreground"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
      </div>
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        aria-label="Category"
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note"
        aria-label="Note"
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
      />
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-4 py-2.5 text-sm text-ink-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className="ml-auto px-3 py-2.5 text-sm text-critical disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
