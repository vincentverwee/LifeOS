"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CountdownPoint, WeekStat, WeekdayStat } from "@/lib/lessons/stats";
import type { CategoryColorSlot } from "@/lib/categoryPalette";
import { formatDate, formatHours } from "@/lib/format";

const tick = { fill: "var(--color-ink-muted)", fontSize: 12 };
const tooltipBox = "rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm";

export type ChartSeries = { key: string; filledKey: string; name: string; active: boolean; color: CategoryColorSlot };

function CountdownTooltip({
  active,
  payload,
  series,
  hasAvg,
}: {
  active?: boolean;
  payload?: { payload: CountdownPoint }[];
  series: ChartSeries[];
  hasAvg: boolean;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className={tooltipBox}>
      <p className="font-medium text-foreground">{p.x === 0 ? "Last exam" : `${-p.x} days before last exam`}</p>
      {series.map((s) => {
        const value = p[s.key] ?? p[s.filledKey];
        if (value === null || value === undefined) return null;
        return (
          <p key={s.key} className="flex items-center gap-1.5 text-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--color-tag-${s.color})` }} aria-hidden="true" />
            {s.name}: {formatHours(value)}
            {p[s.key] === null && <span className="text-ink-muted">(filled in)</span>}
          </p>
        );
      })}
      {hasAvg && p.avg !== null && <p className="text-ink-muted">Average earlier: {formatHours(p.avg)}</p>}
    </div>
  );
}

/** Cumulative hours of each period, lined up on its last exam. */
export function CountdownChart({ points, series, hasAvg }: { points: CountdownPoint[]; series: ChartSeries[]; hasAvg: boolean }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        {series.map((s) => (
          <span key={s.key} className={`inline-flex items-center gap-1.5 ${s.active ? "font-medium text-foreground" : ""}`}>
            <span
              className={`inline-block w-4 rounded ${s.active ? "h-1" : "h-0.5"}`}
              style={{ backgroundColor: `var(--color-tag-${s.color})` }}
            />
            {s.name}
          </span>
        ))}
        {hasAvg && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-2 border-dashed border-ink-muted" />
            Average earlier
          </span>
        )}
        {points.some((p) => series.some((s) => p[s.filledKey] !== null && p[s.key] === null)) && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-2 border-dotted border-ink-muted" />
            Filled in
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={240} minWidth={0} initialDimension={{ width: 320, height: 240 }}>
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", 0]}
            tickFormatter={(x: number) => (x === 0 ? "exam" : String(x))}
            tick={tick}
            axisLine={{ stroke: "var(--color-gridline)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis tickFormatter={(v: number) => `${v}`} tick={tick} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CountdownTooltip series={series} hasAvg={hasAvg} />} cursor={{ stroke: "var(--color-ink-muted)" }} />
          {hasAvg && (
            <Line
              dataKey="avg"
              stroke="var(--color-ink-muted)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {/* the active period last, so it draws on top */}
          {[...series]
            .sort((a, b) => Number(a.active) - Number(b.active))
            .flatMap((s) => [
              <Line
                key={s.filledKey}
                dataKey={s.filledKey}
                stroke={`var(--color-tag-${s.color})`}
                strokeWidth={1.5}
                strokeDasharray="3 4"
                strokeOpacity={0.7}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />,
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stroke={`var(--color-tag-${s.color})`}
                strokeWidth={s.active ? 3 : 2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />,
            ])}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeekTooltip({ active, payload }: { active?: boolean; payload?: { payload: WeekStat }[] }) {
  if (!active || !payload?.length) return null;
  const w = payload[0].payload;
  return (
    <div className={tooltipBox}>
      <p className="font-medium text-foreground">
        Week of {formatDate(w.start)}
        {w.blok ? " · blok" : ""}
      </p>
      <p className="text-ink-muted">{formatHours(w.hours)}</p>
    </div>
  );
}

/** Hours per week; blok weeks full colour, lesson weeks lighter. */
export function WeeklyChart({ weeks }: { weeks: WeekStat[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent/40" />
          Lesson weeks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
          Blok
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200} minWidth={0} initialDimension={{ width: 320, height: 200 }}>
        <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis
            dataKey="start"
            tickFormatter={(d: string) => formatDate(d)}
            tick={tick}
            axisLine={{ stroke: "var(--color-gridline)" }}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<WeekTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {weeks.map((w) => (
              <Cell key={w.start} fill="var(--color-accent)" fillOpacity={w.blok ? 1 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeekdayTooltip({ active, payload }: { active?: boolean; payload?: { payload: WeekdayStat }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={tooltipBox}>
      <p className="font-medium text-foreground">{d.label}</p>
      <p className="text-ink-muted">{formatHours(d.avg)} on average</p>
      <p className="text-ink-muted">
        {formatHours(d.total)} over {d.days} days
      </p>
    </div>
  );
}

export function StudyWeekdayChart({ weekdays }: { weekdays: WeekdayStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={200} minWidth={0} initialDimension={{ width: 320, height: 200 }}>
      <BarChart data={weekdays} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={{ stroke: "var(--color-gridline)" }} tickLine={false} />
        <YAxis tick={tick} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<WeekdayTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
        <Bar dataKey="avg" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
