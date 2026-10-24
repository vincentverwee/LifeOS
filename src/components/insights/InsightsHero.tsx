import type { Month, MonthStats } from "@/lib/monthStats";
import type { Baseline } from "@/lib/insights";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

type InsightsHeroProps = {
  month: Month;
  stats: MonthStats;
  baseline: Baseline | null;
  day: number;
};

/** One card: how much of the budget is gone, and how that compares to a typical period. */
export function InsightsHero({ month, stats, baseline, day }: InsightsHeroProps) {
  const used = month.budget > 0 ? stats.spent / month.budget : 0;
  const pace = Math.min(1, day / stats.daysInMonth); // where you "should" be on the budget line
  const over = stats.spent > month.budget;
  const delta = baseline ? stats.spent - baseline.atDay : null;
  const finished = stats.daysElapsed >= stats.daysInMonth;

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-sm text-ink-muted">
        {finished ? "Spent in total" : `Spent so far · day ${day} of ${stats.daysInMonth}`}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono tabular-nums">
        <span className={`text-3xl font-semibold ${over ? "text-critical" : "text-foreground"}`}>
          {formatCurrencyShort(stats.spent)}
        </span>
        <span className="text-base text-ink-muted">of {formatCurrencyShort(month.budget)}</span>
      </p>

      {/* Budget bar: fill = spent, tick = where the budget line is today. */}
      <div className="relative mt-3 h-2.5 rounded-full bg-surface-muted" aria-hidden="true">
        <div
          className={`h-full rounded-full ${over || used > pace + 0.02 ? "bg-critical" : "bg-accent"}`}
          style={{ width: `${Math.min(100, used * 100)}%` }}
        />
        {!finished && (
          <div
            className="absolute -top-1 h-4.5 w-0.5 rounded bg-foreground/60"
            style={{ left: `calc(${pace * 100}% - 1px)` }}
          />
        )}
      </div>

      {delta !== null && baseline ? (
        <p className={`mt-3 text-sm ${delta <= 0 ? "text-positive-text" : "text-critical"}`}>
          <span aria-hidden="true">{delta <= 0 ? "▼ " : "▲ "}</span>
          {finished ? "" : `By day ${day}: `}
          {formatCurrency(Math.abs(delta))} {delta <= 0 ? "less" : "more"} than a typical{" "}
          {baseline.label} period
          <span className="text-ink-muted"> ({formatCurrencyShort(baseline.atDay)})</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">
          {month.label
            ? `First ${month.label} period, nothing to compare with yet.`
            : "Give this period a label to compare it with similar ones."}
        </p>
      )}
    </section>
  );
}
