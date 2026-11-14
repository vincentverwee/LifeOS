"use client";

import type { EarlierSeries } from "@/lib/earlierSeries";

export type { EarlierSeries };

/** The "show the earlier periods" switch under a comparison chart's legend. */
export function EarlierToggle({
  on,
  onToggle,
  showLabel,
  hideLabel = "Only the average",
}: {
  on: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="btn btn-ghost -mx-3 -mt-1 mb-1 inline-flex min-h-11 px-3 text-sm"
    >
      {on ? hideLabel : showLabel}
    </button>
  );
}

/** Legend swatches for the earlier lines. */
export function EarlierLegend({ series }: { series: EarlierSeries[] }) {
  return (
    <>
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded opacity-80" style={{ backgroundColor: `var(--color-tag-${s.color})` }} />
          {s.name}
        </span>
      ))}
    </>
  );
}

/** Tooltip rows for the earlier lines at one point (skips missing values). */
export function EarlierTooltipRows({
  series,
  point,
  format,
}: {
  series: EarlierSeries[];
  point: Record<string, unknown>;
  format: (n: number) => string;
}) {
  return (
    <>
      {series.map((s) => {
        const v = point[s.key];
        if (typeof v !== "number") return null;
        return (
          <p key={s.key} className="flex items-center gap-1.5 text-ink-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--color-tag-${s.color})` }} aria-hidden="true" />
            {s.name}: {format(v)}
          </p>
        );
      })}
    </>
  );
}
