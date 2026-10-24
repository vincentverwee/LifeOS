import Link from "next/link";
import type { LabelSummary, PeriodEntry } from "@/lib/insights";
import { encodePeriodKey } from "@/lib/period";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

type PeriodListProps = {
  entries: PeriodEntry[];
  summaries: LabelSummary[];
  activeId: string;
};

/** Every period, grouped by label, with the typical spend per label. Tap to open one. */
export function PeriodList({ entries, summaries, activeId }: PeriodListProps) {
  return (
    <div className="flex flex-col gap-5">
      {summaries.map((summary) => {
        const group = entries
          .filter((e) => (e.month.label ?? "Other") === summary.label)
          .sort((a, b) => b.month.startDate.localeCompare(a.month.startDate));
        return (
          <div key={summary.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between px-1 text-sm">
              <span className="font-medium text-foreground">
                {summary.label}
                <span className="font-normal text-ink-muted">
                  {" "}
                  · {summary.count} {summary.count === 1 ? "period" : "periods"}
                </span>
              </span>
              <span className="font-mono text-ink-muted tabular-nums">
                {formatCurrency(summary.avgPerDay)}/day
              </span>
            </div>
            <ul className="overflow-hidden rounded-xl border border-border">
              {group.map(({ month, stats }) => {
                const active = month.id === activeId;
                const used = month.budget > 0 ? Math.min(1, stats.spent / month.budget) : 0;
                const over = stats.spent > month.budget;
                const key = encodePeriodKey({ type: month.kind === "trip" ? "trip" : "cycle", id: month.id });
                return (
                  <li key={month.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/budget/insights?period=${encodeURIComponent(key)}`}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-14 flex-col justify-center gap-1.5 px-3 py-2.5 active:bg-surface-muted ${
                        active ? "bg-surface-muted" : "bg-surface"
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">
                          {month.name}
                          {stats.isCurrent && <span className="ml-1.5 text-xs text-ink-muted">now</span>}
                        </span>
                        <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                          {formatCurrency(stats.avgPerDay)}
                          <span className="text-xs text-ink-muted">/day</span>
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-background" aria-hidden="true">
                          <span
                            className={`block h-full rounded-full ${over ? "bg-critical" : "bg-accent"}`}
                            style={{ width: `${used * 100}%` }}
                          />
                        </span>
                        <span className="shrink-0 text-right font-mono text-xs tabular-nums text-ink-muted">
                          {formatCurrencyShort(stats.spent)} / {formatCurrencyShort(month.budget)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
