"use client";

import { useState } from "react";
import { formatCurrency, formatCurrencyShort, formatPercent } from "@/lib/format";

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

/** Categories of the selected period. Tap one to see it across all periods. */
export function CategoryList({ rows, typicalLabel }: { rows: CategoryRow[]; typicalLabel: string | null }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">No spending in this period yet.</p>;
  }

  return (
    <ul className="-mx-1 flex flex-col">
      {rows.map((row) => {
        const open = openId === row.id;
        const max = Math.max(1, ...row.history.map((h) => h.amount));
        return (
          <li key={row.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : row.id)}
              aria-expanded={open}
              className="flex min-h-14 w-full flex-col justify-center gap-1.5 rounded-lg px-1 py-2.5 text-left active:bg-surface-muted"
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
              <span className="flex w-full items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.min(100, row.percent)}%`, backgroundColor: `var(--color-tag-${row.color})` }}
                  />
                </span>
                <span className="w-9 text-right text-xs text-ink-muted">{formatPercent(row.percent)}</span>
              </span>
            </button>

            {open && (
              <div className="px-1 pb-3">
                <p className="mb-2 text-xs text-ink-muted">
                  {row.name} per period
                  {row.delta !== null && typicalLabel
                    ? ` · ${row.delta <= 0 ? "below" : "above"} a typical ${typicalLabel} period so far`
                    : ""}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {row.history.map((h) => (
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
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
