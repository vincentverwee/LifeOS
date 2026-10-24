"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeekdayStat } from "@/lib/monthStats";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

function WeekdayTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: WeekdayStat }[];
}) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{day.label}</p>
      <p className="text-ink-muted">{formatCurrency(day.total)} total</p>
      <p className="text-ink-muted">
        {formatCurrency(day.avgPerDay)}/day avg over {day.days} days
      </p>
    </div>
  );
}

export function WeekdayChart({ weekdays }: { weekdays: WeekdayStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={weekdays} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--color-gridline)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value: number) => formatCurrencyCompact(value)}
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<WeekdayTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
        <Bar
          dataKey="avgPerDay"
          fill="var(--color-accent)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
