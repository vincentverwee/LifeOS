"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryStat } from "@/lib/data/trips";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatCurrency, formatPercent } from "@/lib/format";

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoryStat }[];
}) {
  if (!active || !payload?.length) return null;
  const category = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{category.name}</p>
      <p className="text-ink-muted">{formatCurrency(category.totalSpent)} spent</p>
      <p className="text-ink-muted">{formatPercent(category.percentOfBudget)} of budget</p>
      <p className="text-ink-muted">{formatCurrency(category.dailyAverage)}/day avg</p>
    </div>
  );
}

type CategoryBreakdownProps = {
  categories: CategoryStat[];
};

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const withSpend = categories.filter((c) => c.totalSpent > 0);

  if (withSpend.length === 0) {
    return <EmptyState variant="trip" />;
  }

  const chartHeight = Math.max(120, withSpend.length * 44);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={withSpend}
        layout="vertical"
        margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
        barCategoryGap={8}
      >
        <CartesianGrid stroke="var(--color-gridline)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(value: number) => formatCurrency(value)}
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "var(--color-foreground)", fontSize: 13 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip content={<CategoryTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
        <Bar
          dataKey="totalSpent"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          isAnimationActive={false}
          label={{
            position: "right",
            fill: "var(--color-ink-muted)",
            fontSize: 12,
            formatter: (value: unknown) => formatCurrency(Number(value)),
          }}
        >
          {withSpend.map((category) => (
            <Cell key={category.id} fill="var(--color-accent)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
