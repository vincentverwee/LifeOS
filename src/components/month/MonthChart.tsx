"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/monthStats";
import { formatCurrency, formatCurrencyCompact, formatDate } from "@/lib/format";

function MonthTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DailyPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const diff = point.cumulative !== null ? point.budgetLine - point.cumulative : null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{formatDate(point.date)}</p>
      <p className="text-ink-muted">Budget line: {formatCurrency(point.budgetLine)}</p>
      {point.cumulative !== null && (
        <>
          <p className="text-ink-muted">Spent so far: {formatCurrency(point.cumulative)}</p>
          <p className="text-ink-muted">That day: {formatCurrency(point.total)}</p>
          {diff !== null && (
            <p className={diff >= 0 ? "text-positive-text" : "text-critical"}>
              {diff >= 0 ? "Under" : "Over"} the line by {formatCurrency(Math.abs(diff))}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function MonthChart({ daily }: { daily: DailyPoint[] }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-ink-muted" />
          Budget line
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-accent" />
          Spent so far
        </span>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value)}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--color-gridline)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<MonthTooltip />} cursor={{ stroke: "var(--color-ink-muted)" }} />
          <Line
            dataKey="budgetLine"
            stroke="var(--color-ink-muted)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="cumulative"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
