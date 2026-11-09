"use client";

import { useActionState, useEffect, useRef } from "react";
import { logWeight, type SimpleFormState } from "@/lib/actions/workouts";
import { formatChange, formatKg, weightTrend, type WeighIn } from "@/lib/workouts/weight";
import { describeDoneOn } from "@/lib/reminders/schedule";
import { FIELD } from "@/components/workouts/ui";

/** A tiny line of the last weigh-ins (no axes; the chart on Insights has those). */
export function Sparkline({ points, className = "h-10 w-full" }: { points: WeighIn[]; className?: string }) {
  if (points.length < 2) return null;
  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs);
  const span = Math.max(...kgs) - min || 1;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * 100).toFixed(2)} ${(28 - ((p.kg - min) / span) * 24).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={`${className} text-primary`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Body weight on Today: today's weigh-in box, the latest, the 30-day change and a sparkline. */
export function WeightCard({ weighIns, todayKey }: { weighIns: WeighIn[]; todayKey: string }) {
  const [state, action, pending] = useActionState<SimpleFormState, FormData>(logWeight, null);
  const form = useRef<HTMLFormElement>(null);
  const trend = weightTrend(weighIns);
  const todays = weighIns.find((w) => w.date === todayKey);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-title">Body weight</h2>
        {trend && (
          <span className="text-sm text-ink-muted">
            {describeDoneOn(trend.latest.date, todayKey)}
          </span>
        )}
      </div>
      {trend && (
        <>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-foreground">{formatKg(trend.latest.kg)}</p>
          <p className="text-sm text-ink-muted">
            7-day average {formatKg(trend.average7)}
            {trend.change30 !== null && ` · ${formatChange(trend.change30)} in 30 days`}
          </p>
          <Sparkline points={weighIns.slice(-30)} className="mt-3 h-10 w-full" />
        </>
      )}
      <form ref={form} action={action} className="mt-4 flex gap-2">
        <input type="hidden" name="date" value={todayKey} />
        <label className="flex-1">
          <span className="sr-only">Weight in kg</span>
          <input
            name="kg"
            inputMode="decimal"
            required
            placeholder={todays ? `Today: ${formatKg(todays.kg)}` : "Today's weight (kg)"}
            className={`${FIELD} w-full`}
          />
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary min-h-11 px-5 text-sm font-semibold">
          {todays ? "Update" : "Save"}
        </button>
      </form>
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-sm text-critical">
          {state.error}
        </p>
      )}
    </section>
  );
}
