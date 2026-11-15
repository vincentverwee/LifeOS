"use client";

import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCurrencyShort, formatDate } from "@/lib/format";
import { formatSignedCurrency } from "@/lib/invest/format";
import type { SeriesPoint } from "@/lib/invest/stats";

const tick = { fill: "var(--color-ink-muted)", fontSize: 12 };
const tooltipBox = "rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm";

/** The portfolio's value (filled) against the money put in (dashed). */
export function ValueChart({ points, height = 220 }: { points: SeriesPoint[]; height?: number }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={height} minWidth={0} initialDimension={{ width: 320, height }}>
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={tick} axisLine={{ stroke: "var(--color-gridline)" }} tickLine={false} minTickGap={32} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={52} domain={["auto", "auto"]} tickFormatter={(v: number) => formatCurrencyShort(v)} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as SeriesPoint;
              return (
                <div className={tooltipBox}>
                  <p className="font-medium text-foreground">{formatDate(p.date)}</p>
                  <p className="text-foreground">Worth {formatCurrency(p.value)}</p>
                  <p className="text-ink-muted">Put in {formatCurrency(p.deposited)}</p>
                  <p className="text-ink-muted">{formatSignedCurrency(p.value - p.deposited)}</p>
                </div>
              );
            }}
          />
          <Area dataKey="value" type="monotone" stroke="var(--color-primary)" strokeWidth={2} fill="var(--color-primary)" fillOpacity={0.12} isAnimationActive={false} />
          <Line dataKey="deposited" type="stepAfter" stroke="var(--color-ink-muted)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export type MonthBar = { month: string; label: string; net: number };

/** Money put in (or taken out) per month. */
export function DepositsChart({ months, height = 180 }: { months: MonthBar[]; height?: number }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={height} minWidth={0} initialDimension={{ width: 320, height }}>
        <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis dataKey="label" tick={tick} axisLine={{ stroke: "var(--color-gridline)" }} tickLine={false} minTickGap={8} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => formatCurrencyShort(v)} />
          <ReferenceLine y={0} stroke="var(--color-gridline)" />
          <Tooltip
            cursor={{ fill: "var(--color-surface-muted)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const m = payload[0].payload as MonthBar;
              return (
                <div className={tooltipBox}>
                  <p className="font-medium text-foreground">{m.label}</p>
                  <p className="text-ink-muted">{m.net >= 0 ? `Put in ${formatCurrency(m.net)}` : `Taken out ${formatCurrency(-m.net)}`}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="net" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
