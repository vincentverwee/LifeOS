"use client";

import { format, parse } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TagTrendPoint } from "@/lib/data/tagAnalytics";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatCurrency } from "@/lib/format";

function formatBucket(bucket: string): string {
  return format(parse(bucket, "yyyy-MM", new Date()), "MMM yyyy");
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TagTrendPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{formatBucket(point.bucket)}</p>
      <p className="text-ink-muted">{formatCurrency(point.amount)}</p>
    </div>
  );
}

type TagTrendChartProps = {
  trend: TagTrendPoint[];
};

export function TagTrendChart({ trend }: TagTrendChartProps) {
  if (trend.length < 2) {
    return <EmptyState variant="tag-trend" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
        <XAxis
          dataKey="bucket"
          tickFormatter={formatBucket}
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
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--color-ink-muted)" }} />
        <Line
          dataKey="amount"
          stroke="var(--color-accent)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--color-accent)", strokeWidth: 2, stroke: "var(--color-surface)" }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
