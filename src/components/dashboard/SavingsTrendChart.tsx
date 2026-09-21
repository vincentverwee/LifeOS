"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SavingsEntry } from "@/lib/data/savings";
import { formatCurrency, formatDate } from "@/lib/format";
import { SummaryCard } from "@/components/dashboard/SummaryCard";

function SavingsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SavingsEntry }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{formatDate(entry.date)}</p>
      <p className="text-ink-muted">{formatCurrency(entry.runningTotal)}</p>
      {entry.bonusAmount !== null && (
        <p className="text-positive-text">+{formatCurrency(entry.bonusAmount)} bonus</p>
      )}
    </div>
  );
}

type SavingsTrendChartProps = {
  entries: SavingsEntry[];
};

export function SavingsTrendChart({ entries }: SavingsTrendChartProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
        No savings entries logged yet.
      </p>
    );
  }

  if (entries.length < 2) {
    const only = entries[0];
    return (
      <SummaryCard
        label="Latest savings entry"
        value={formatCurrency(only.runningTotal)}
        hint="Add another entry to see a trend"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={entries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
        <Tooltip content={<SavingsTooltip />} cursor={{ stroke: "var(--color-ink-muted)" }} />
        <Line
          dataKey="runningTotal"
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
