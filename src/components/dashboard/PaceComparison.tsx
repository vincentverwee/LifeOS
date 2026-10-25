import Link from "next/link";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

export type PaceRow = {
  /** "September 2026", "a typical Galway month" */
  title: string;
  /** what they had spent by the same day */
  theirs: number;
  /** false when their period was shorter than today's day number */
  fullPeriod: boolean;
};

type PaceComparisonProps = {
  day: number;
  daysInMonth: number;
  spent: number;
  rows: PaceRow[];
  insightsHref: string;
};

/** "By day 24": this month's spend against last month and the typical month, same day. */
export function PaceComparison({ day, daysInMonth, spent, rows, insightsHref }: PaceComparisonProps) {
  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium text-foreground">
          By day {day} <span className="font-normal text-ink-muted">of {daysInMonth}</span>
        </h2>
        <span className="font-mono text-sm tabular-nums text-ink-muted">
          {formatCurrencyShort(spent)} spent
        </span>
      </div>

      <ul className="mt-3 flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const delta = spent - row.theirs;
          const better = delta <= 0;
          return (
            <li key={row.title} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="flex min-w-0 flex-col">
                <span className="text-sm text-foreground">vs {row.title}</span>
                <span className="text-xs text-ink-muted">
                  {formatCurrencyShort(row.theirs)} {row.fullPeriod ? `by day ${day}` : "in the whole period"}
                </span>
              </span>
              <span
                className={`shrink-0 text-right font-mono text-base font-semibold tabular-nums ${
                  better ? "text-positive-text" : "text-critical"
                }`}
              >
                <span aria-hidden="true">{better ? "▼ " : "▲ "}</span>
                {formatCurrency(Math.abs(delta))}
                <span className="block font-sans text-xs font-normal">{better ? "less" : "more"}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <Link href={insightsHref} className="btn btn-ghost -mx-3 mt-3 inline-flex min-h-11 px-3 text-sm">
        See insights ›
      </Link>
    </section>
  );
}
