"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  total: number;
  percent: number;
  /** spent minus the peer-group average at the same day; null without peers */
  delta: number | null;
  /** this category's total in every period, oldest first */
  history: { periodId: string; name: string; label: string | null; amount: number; active: boolean }[];
};

/** History lines shown before "Show all". */
const HISTORY_SHOWN = 6;

/** Categories of the selected period. Tap one to see it across recent periods. Several can be
 *  open at once, so opening a row never collapses one above it and jumps the page. */
export function CategoryList({
  rows,
  typicalLabel,
  periodKey,
}: {
  rows: CategoryRow[];
  typicalLabel: string | null;
  /** encoded period key, for the "see expenses" link */
  periodKey: string;
}) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const [fullIds, setFullIds] = useState<ReadonlySet<string>>(new Set());
  const toggle = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    return next;
  };

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">No spending in this period yet.</p>;
  }

  return (
    <ul className="-mx-1 flex flex-col">
      {rows.map((row) => {
        const open = openIds.has(row.id);
        const full = fullIds.has(row.id);
        const history = full ? row.history : row.history.slice(-HISTORY_SHOWN);
        const max = Math.max(1, ...history.map((h) => h.amount));
        return (
          <li key={row.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenIds((ids) => toggle(ids, row.id))}
              aria-expanded={open}
              className="tap flex min-h-14 w-full flex-col justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-left"
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--color-tag-${row.color})` }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-foreground">{row.name}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  {row.delta !== null && Math.abs(row.delta) >= 1 && (
                    <span className={`text-xs ${row.delta <= 0 ? "text-positive-text" : "text-critical"}`}>
                      {row.delta <= 0 ? "▼" : "▲"} {formatCurrencyShort(Math.abs(row.delta))}
                    </span>
                  )}
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(row.total)}
                  </span>
                </span>
              </span>
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.min(100, row.percent)}%`, backgroundColor: `var(--color-tag-${row.color})` }}
                />
              </span>
            </button>

            {open && (
              <div className="animate-fade-in px-1 pb-3">
                <p className="mb-2 text-xs text-ink-muted">
                  {row.name} per period
                  {row.delta !== null && typicalLabel
                    ? ` · ${row.delta <= 0 ? "below" : "above"} a typical ${typicalLabel} period so far`
                    : ""}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {history.map((h) => (
                    <li key={h.periodId} className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-28 shrink-0 truncate ${h.active ? "font-semibold text-foreground" : "text-ink-muted"}`}
                      >
                        {h.name}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${(h.amount / max) * 100}%`,
                            backgroundColor: `var(--color-tag-${row.color})`,
                            opacity: h.active ? 1 : 0.55,
                          }}
                        />
                      </span>
                      <span className="w-16 shrink-0 text-right font-mono tabular-nums text-foreground">
                        {formatCurrencyShort(h.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 flex flex-wrap items-center gap-x-2">
                  {row.history.length > HISTORY_SHOWN && (
                    <button
                      type="button"
                      onClick={() => setFullIds((ids) => toggle(ids, row.id))}
                      className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm"
                    >
                      {full ? "Show fewer" : `Show all ${row.history.length}`}
                    </button>
                  )}
                  <Link
                  href={`/budget/expenses?period=${encodeURIComponent(periodKey)}&category=${encodeURIComponent(row.id)}`}
                    className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm"
                  >
                    See the {row.name} expenses ›
                  </Link>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
