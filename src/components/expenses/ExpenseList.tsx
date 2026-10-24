"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ListExpense } from "@/lib/data/expenses";
import { deleteExpense, updateExpense } from "@/lib/actions/expenses";
import { formatCurrency, formatDate, parseAmount } from "@/lib/format";
import { CategoryChip } from "@/components/categories/CategoryChip";

type ExpenseListProps = {
  expenses: ListExpense[];
  categories: { id: string; name: string }[];
};

export function ExpenseList({ expenses, categories }: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p className="text-sm text-ink-muted">Nothing logged yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {expenses.map((expense) => (
        <li key={expense.id} className="rounded-xl border border-border bg-surface p-3">
          {editingId === expense.id ? (
            <EditRow
              expense={expense}
              categories={categories}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingId(expense.id)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <CategoryChip
                    name={expense.categoryName}
                    color={expense.categoryColor}
                    className="!px-2 !py-0.5 !text-xs"
                  />
                  <span className="text-sm text-ink-muted">{formatDate(expense.date)}</span>
                </span>
                {expense.note && <span className="truncate text-sm text-ink-muted">{expense.note}</span>}
              </span>
              <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                {formatCurrency(expense.amount)}
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
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
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount"
          className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm tabular-nums text-foreground"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        aria-label="Category"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
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
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
      />
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-3 py-2 text-sm text-ink-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className="ml-auto px-2 text-sm text-critical disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
