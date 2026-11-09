"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ListExpense } from "@/lib/data/expenses";
import { deleteExpense } from "@/lib/actions/expenses";
import { formatCurrency, formatDate, plural } from "@/lib/format";
import { pintsOf } from "@/lib/monthStats";
import { EditRow, type CategoryOption } from "@/components/expenses/ExpenseList";
import type { PubOption } from "@/lib/beer/types";

/** The newest beers on Overview; tap one to correct it in place. */
export function LatestBeers({
  beers,
  categories,
  pubs,
}: {
  beers: ListExpense[];
  categories: CategoryOption[];
  pubs: PubOption[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function remove(beer: ListExpense) {
    setError(null);
    startTransition(async () => {
      const result = await deleteExpense(beer.id);
      if (!result.ok) {
        setError(result.error);
        router.refresh();
      }
      setEditingId(null);
    });
  }

  return (
    <>
      {error && <p className="text-sm text-critical">{error}</p>}
      <ul className="card-list">
        {beers.map((b) => {
          const pintPrice = categories.find((c) => c.id === b.categoryId)?.pintPrice ?? 0;
          const pints = pintsOf({ amount: b.amount, pintPrice, pints: b.pints });
          return (
            <li key={b.id}>
              {editingId === b.id ? (
                <div className="p-3">
                  <EditRow
                    expense={b}
                    categories={categories}
                    pubs={pubs}
                    onDone={() => setEditingId(null)}
                    onDelete={() => remove(b)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingId(b.id)}
                  aria-label={`Edit ${b.pubName ?? "beer"} ${formatCurrency(b.amount)}`}
                  className="tap flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-foreground">{b.pubName ?? "No pub"}</span>
                    <span className="text-xs text-ink-muted">
                      {formatDate(b.date)}
                      {pints > 0 && ` · ${plural(pints, "pint", "pints")}${b.pints ? "" : " (guessed)"}`}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(b.amount)}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
