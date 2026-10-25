"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPeriodLabel, updateMonthBudget } from "@/lib/actions/cycles";
import { formatCurrencyShort, parseAmount } from "@/lib/format";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

export type MonthRow = {
  id: string;
  name: string;
  label: string | null;
  budget: number;
  spent: number;
};

const input = "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground";

/** Every month's budget and label, newest first. */
export function MonthList({ months, labels }: { months: MonthRow[]; labels: string[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-surface">
      <datalist id="period-labels">
        {labels.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      {months.map((month) => (
        <li key={month.id} className="border-b border-border p-3 last:border-b-0">
          {editingId === month.id ? (
            <EditMonth month={month} onDone={() => setEditingId(null)} />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{month.name}</span>
                <span className="text-xs text-ink-muted">
                  {month.label ?? "No label"} · {formatCurrencyShort(month.spent)} of{" "}
                  {formatCurrencyShort(month.budget)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(month.id)}
                className="btn btn-ghost min-h-11 px-4 text-sm"
              >
                Edit
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function EditMonth({ month, onDone }: { month: MonthRow; onDone: () => void }) {
  const router = useRouter();
  const [budget, setBudget] = useState(String(month.budget).replace(".", ","));
  const [label, setLabel] = useState(month.label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    const amount = parseAmount(budget);
    if (amount === null || amount <= 0) return setError("Enter a budget greater than zero.");
    setError(null);
    startTransition(async () => {
      if (amount !== month.budget) {
        const result = await updateMonthBudget({ cycleId: month.id, budget: amount });
        if (!result.ok) return setError(result.error);
      }
      if (label.trim() && label.trim() !== month.label) {
        const result = await setPeriodLabel({ cycleId: month.id, label });
        if (!result.ok) return setError(result.error);
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-foreground">{month.name}</span>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-ink-muted">Budget</span>
          <input
            type="text"
            inputMode="decimal"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className={`${input} font-mono tabular-nums`}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-ink-muted">Compare with</span>
          <input
            type="text"
            list="period-labels"
            value={label}
            maxLength={24}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Thuis"
            className={input}
          />
        </label>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="btn btn-primary inline-flex flex-1 px-4 py-3 text-sm font-semibold"
        >
          {isPending && <SheepSpinner size={18} />}
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="btn btn-outline px-5 py-3 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
