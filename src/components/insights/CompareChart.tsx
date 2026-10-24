"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

export type ComparePoint = {
  day: number;
  /** this period's cumulative spend; null for days still to come */
  actual: number | null;
  /** typical cumulative spend of the peer group; null if none */
  typical: number | null;
  budget: number;
};

function CompareTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: ComparePoint }[];
  label?: string;
  typicalLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">Day {p.day}</p>
      {p.actual !== null && <p className="text-foreground">This period: {formatCurrency(p.actual)}</p>}
      {p.typical !== null && (
        <p className="text-ink-muted">
          Typical{label ? ` ${label}` : ""}: {formatCurrency(p.typical)}
        </p>
      )}
      <p className="text-ink-muted">Budget line: {formatCurrency(p.budget)}</p>
    </div>
  );
}

export function CompareChart({ data, typicalLabel }: { data: ComparePoint[]; typicalLabel: string | null }) {
  const hasTypical = data.some((d) => d.typical !== null);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-accent" />
          This period
        </span>
        {hasTypical && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[var(--color-tag-blue)]" />
            Typical {typicalLabel}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dotted border-ink-muted" />
          Budget
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220} minWidth={0} initialDimension={{ width: 320, height: 220 }}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--color-gridline)" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrencyCompact(v)}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={<CompareTooltip label={typicalLabel ?? undefined} />}
            cursor={{ stroke: "var(--color-ink-muted)" }}
          />
          <Line
            dataKey="budget"
            stroke="var(--color-ink-muted)"
            strokeWidth={1.5}
            strokeDasharray="2 4"
            dot={false}
            isAnimationActive={false}
          />
          {hasTypical && (
            <Line
              dataKey="typical"
              stroke="var(--color-tag-blue)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="actual"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
