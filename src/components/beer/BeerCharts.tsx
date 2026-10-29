"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

// Beer's versions of Budget's CompareChart / WeekdayChart: the same look, counting pints.

const axisTick = { fill: "var(--color-ink-muted)", fontSize: 12 };
const tooltipBox = "rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm";

function pints(n: number) {
  return `${n} ${n === 1 ? "pint" : "pints"}`;
}

export type PintsPoint = { day: number; actual: number | null; usual: number | null };

/** Running pints this month vs the usual month, by day of the month. */
export function PintsCompareChart({ data, usualLabel }: { data: PintsPoint[]; usualLabel: string | null }) {
  const hasUsual = data.some((d) => d.usual !== null);
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-accent" />
          This month
        </span>
        {hasUsual && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[var(--color-tag-blue)]" />
            {usualLabel === "your usual month" ? "Usual month" : usualLabel}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220} minWidth={0} initialDimension={{ width: 320, height: 220 }}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis dataKey="day" tick={axisTick} axisLine={{ stroke: "var(--color-gridline)" }} tickLine={false} minTickGap={20} />
          <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            cursor={{ stroke: "var(--color-ink-muted)" }}
            content={({ active, payload }) => {
              const p = active && payload?.length ? (payload[0].payload as PintsPoint) : null;
              if (!p) return null;
              return (
                <div className={tooltipBox}>
                  <p className="font-medium text-foreground">Day {p.day}</p>
                  {p.actual !== null && <p className="text-foreground">This month: {pints(p.actual)}</p>}
                  {p.usual !== null && (
                    <p className="text-ink-muted">
                      {usualLabel === "your usual month" ? "Usual" : usualLabel}: {pints(p.usual)}
                    </p>
                  )}
                </div>
              );
            }}
          />
          {hasUsual && (
            <Line
              dataKey="usual"
              stroke="var(--color-tag-blue)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Line dataKey="actual" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export type BarPoint = { label: string; pints: number; detail?: string };

/** Pints as bars: per weekday, or per month. */
export function PintsBarChart({ data, height = 200 }: { data: BarPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0} initialDimension={{ width: 320, height }}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: "var(--color-gridline)" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          cursor={{ fill: "var(--color-surface-muted)" }}
          content={({ active, payload }) => {
            const p = active && payload?.length ? (payload[0].payload as BarPoint) : null;
            if (!p) return null;
            return (
              <div className={tooltipBox}>
                <p className="font-medium text-foreground">{p.label}</p>
                <p className="text-ink-muted">{pints(p.pints)}</p>
                {p.detail && <p className="text-ink-muted">{p.detail}</p>}
              </div>
            );
          }}
        />
        <Bar dataKey="pints" fill="var(--color-accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export type PricePoint = { label: string; price: number; pints: number };

/** Price per pint over time (counted beers only). */
export function PriceChart({ data, height = 180 }: { data: PricePoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0} initialDimension={{ width: 320, height }}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: "var(--color-gridline)" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => `€${v.toFixed(0)}`}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-ink-muted)" }}
          content={({ active, payload }) => {
            const p = active && payload?.length ? (payload[0].payload as PricePoint) : null;
            if (!p) return null;
            return (
              <div className={tooltipBox}>
                <p className="font-medium text-foreground">{p.label}</p>
                <p className="text-foreground">{formatCurrency(p.price)} a pint</p>
                <p className="text-ink-muted">over {pints(p.pints)}</p>
              </div>
            );
          }}
        />
        <Line dataKey="price" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
