"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/format";
import { formatMinutes } from "@/lib/workouts/types";

const tick = { fill: "var(--color-ink-muted)", fontSize: 12 };
const tooltipBox = "rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm";

type Week = { monday: string; sessions: number; minutes: number };

function WeekTooltip({ active, payload }: { active?: boolean; payload?: { payload: Week }[] }) {
  if (!active || !payload?.length) return null;
  const w = payload[0].payload;
  return (
    <div className={tooltipBox}>
      <p className="font-medium text-foreground">Week of {formatDate(w.monday)}</p>
      <p className="text-ink-muted">
        {w.sessions} {w.sessions === 1 ? "workout" : "workouts"} · {formatMinutes(w.minutes)}
      </p>
    </div>
  );
}

/** Workouts per week, with the weekly goal as a line. */
export function WeeksChart({ weeks, goal }: { weeks: Week[]; goal: number | null }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={200} minWidth={0} initialDimension={{ width: 320, height: 200 }}>
        <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis dataKey="monday" tickFormatter={(d: string) => formatDate(d)} tick={tick} axisLine={{ stroke: "var(--color-gridline)" }} tickLine={false} minTickGap={16} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
          <Tooltip content={<WeekTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
          {goal !== null && <ReferenceLine y={goal} stroke="var(--color-foreground)" strokeOpacity={0.5} strokeDasharray="4 4" />}
          <Bar dataKey="sessions" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type TrendPoint = { date: string; value: number };

/** A plain line over time (pace, best set, body weight); `format` labels the values. `invert` puts lower values on top (pace). */
export function TrendChart({
  points,
  format,
  invert = false,
  height = 160,
}: {
  points: TrendPoint[];
  format: "pace" | "kg" | "reps" | "seconds";
  invert?: boolean;
  height?: number;
}) {
  const label = (v: number) => {
    if (format === "pace") return `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}`;
    if (format === "kg") return `${v.toLocaleString("nl-BE", { maximumFractionDigits: 1 })}`;
    if (format === "seconds") return `${v} s`;
    return String(v);
  };
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={height} minWidth={0} initialDimension={{ width: 320, height }}>
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gridline)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={tick} axisLine={{ stroke: "var(--color-gridline)" }} tickLine={false} minTickGap={24} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={44} reversed={invert} domain={["auto", "auto"]} tickFormatter={label} />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className={tooltipBox}>
                  <p className="font-medium text-foreground">{formatDate((payload[0].payload as TrendPoint).date)}</p>
                  <p className="text-ink-muted">
                    {label((payload[0].payload as TrendPoint).value)}
                    {format === "pace" ? " /km" : format === "kg" ? " kg" : format === "reps" ? " reps" : ""}
                  </p>
                </div>
              ) : null
            }
          />
          <Line dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
