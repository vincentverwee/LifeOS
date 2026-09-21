"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CycleDay } from "@/lib/data/cycles";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";

type ChartPoint = {
  date: string;
  theoretical: number;
  actual: number | null;
  aheadBand: [number, number] | null;
  behindBand: [number, number] | null;
};

function toChartData(days: CycleDay[]): ChartPoint[] {
  return days.map((day) => {
    const actual = day.totalBalance;
    const theoretical = day.theoreticalBalance;
    return {
      date: day.date,
      theoretical,
      actual,
      aheadBand: actual !== null && actual >= theoretical ? [theoretical, actual] : null,
      behindBand: actual !== null && actual < theoretical ? [actual, theoretical] : null,
    };
  });
}

function BalanceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const diff = point.actual !== null ? point.actual - point.theoretical : null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{formatDate(point.date)}</p>
      <p className="text-ink-muted">Theoretical: {formatCurrency(point.theoretical)}</p>
      <p className="text-ink-muted">
        Actual: {point.actual !== null ? formatCurrency(point.actual) : "not logged"}
      </p>
      {diff !== null && (
        <p className={diff >= 0 ? "text-positive-text" : "text-critical"}>
          {diff >= 0 ? "Ahead" : "Behind"} by {formatCurrency(Math.abs(diff))}
        </p>
      )}
    </div>
  );
}

type BalanceChartProps = {
  days: CycleDay[];
};

export function BalanceChart({ days }: BalanceChartProps) {
  if (days.length < 2) {
    return <EmptyState variant="cycle" />;
  }

  const data = toChartData(days);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-ink-muted" />
          Theoretical
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-accent" />
          Actual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-good/60" />
          Ahead of plan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-critical/60" />
          Behind plan
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            tickFormatter={(value: number) => formatCurrency(value)}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<BalanceTooltip />} cursor={{ stroke: "var(--color-ink-muted)" }} />
          <Area
            dataKey="aheadBand"
            stroke="none"
            fill="var(--color-good)"
            fillOpacity={0.14}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Area
            dataKey="behindBand"
            stroke="none"
            fill="var(--color-critical)"
            fillOpacity={0.14}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            dataKey="theoretical"
            stroke="var(--color-ink-muted)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="actual"
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
