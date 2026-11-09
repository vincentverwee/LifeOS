import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getBodyWeights, getGoal, getSetLites, getWorkoutLites, getWorkouts } from "@/lib/data/workouts";
import { getTodayKey } from "@/lib/today";
import { addDays, formatDay } from "@/lib/reminders/schedule";
import { byActivity, byWeekday, exerciseBests, formatPace, monthToDate, pace, weeklyTotals } from "@/lib/workouts/stats";
import { formatChange, formatKg, weightTrend } from "@/lib/workouts/weight";
import { formatKm, formatMinutes, formatSeconds } from "@/lib/workouts/types";
import { Disclosure } from "@/components/Disclosure";
import { ActivityDot } from "@/components/workouts/ui";
import { TrendChart, WeeksChart } from "@/components/workouts/WorkoutChartsLazy";
import { WeightList } from "@/components/workouts/WeightList";
import { ADD_HREF } from "@/components/workouts/nav";

export const metadata = { title: "Workout insights" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function change(now: number, before: number, unit: (n: number) => string): string {
  if (before === 0) return now === 0 ? "same as last month" : "nothing by now last month";
  const diff = now - before;
  if (diff === 0) return "same as last month by now";
  return `${diff > 0 ? "+" : "−"}${unit(Math.abs(diff))} vs last month by now`;
}

export default async function WorkoutInsightsPage() {
  const todayKey = await getTodayKey();
  const [lites, goal, sets, weights, cardio] = await Promise.all([
    getWorkoutLites(),
    getGoal(),
    getSetLites(),
    getBodyWeights(),
    getWorkouts({ from: addDays(todayKey, -365) }),
  ]);
  const past = lites.filter((w) => w.date <= todayKey);

  if (past.length === 0 && weights.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Insights" back={{ href: "/workouts", label: "Workouts" }} />
        <p className="text-sm text-ink-muted">Nothing to look at yet. Log a few workouts first.</p>
        <Link href={ADD_HREF} className="btn btn-primary inline-flex min-h-11 self-start px-5 text-sm font-semibold">
          Log a workout
        </Link>
      </div>
    );
  }

  const { thisMonth, lastMonth } = monthToDate(past, todayKey);
  const weeks = weeklyTotals(past, todayKey, 12);
  const twelveWeeks = past.filter((w) => w.date >= weeks[0].monday);
  const activities = byActivity(twelveWeeks);
  const weekday = byWeekday(past);
  const topDay = Math.max(1, ...weekday);
  const bests = exerciseBests(sets);
  const trend = weightTrend(weights);

  // Cardio with a distance: per activity, the pace (or nothing) of each session in the last year, oldest first.
  const cardioByActivity = new Map<string, { name: string; color: string; points: { date: string; value: number }[]; km: number; best: number | null }>();
  for (const w of [...cardio].reverse()) {
    if (w.activity.kind !== "cardio" || !w.distanceKm || !w.durationMin) continue;
    const p = pace(w.distanceKm, w.durationMin);
    const entry = cardioByActivity.get(w.activity.id) ?? { name: w.activity.name, color: w.activity.color, points: [], km: 0, best: null };
    entry.km += w.distanceKm;
    if (p !== null) {
      entry.points.push({ date: w.date, value: Math.round(p * 100) / 100 });
      entry.best = entry.best === null ? p : Math.min(entry.best, p);
    }
    cardioByActivity.set(w.activity.id, entry);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Insights" back={{ href: "/workouts", label: "Workouts" }} />

      <section className="card p-5">
        <p className="text-sm text-ink-muted">This month</p>
        <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-foreground">
          {thisMonth.sessions} <span className="text-lg text-ink-muted">{thisMonth.sessions === 1 ? "workout" : "workouts"}</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {formatMinutes(thisMonth.minutes)}
          {thisMonth.km > 0 && ` · ${formatKm(thisMonth.km)}`} · {change(thisMonth.sessions, lastMonth.sessions, (n) => String(n))}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="section-title">Last 12 weeks</h2>
        <WeeksChart weeks={weeks} goal={goal} />
        {goal !== null && (
          <p className="text-sm text-ink-muted">
            Goal met in {weeks.filter((w) => w.sessions >= goal).length} of the last {weeks.length} weeks (dashed line = {goal} a week).
          </p>
        )}
      </section>

      {activities.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="section-title">What you did</h2>
          <ul className="flex flex-col divide-y divide-border">
            {activities.map((a) => (
              <li key={a.activityId} className="flex min-h-12 items-center gap-3">
                <ActivityDot activity={{ color: cardio.find((w) => w.activity.id === a.activityId)?.activity.color ?? "blue" }} />
                <span className="flex-1 font-medium text-foreground">{a.name}</span>
                <span className="text-right text-sm text-ink-muted">
                  {a.sessions}× · {formatMinutes(a.minutes)}
                  {a.km > 0 && ` · ${formatKm(a.km)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3">
        {cardioByActivity.size > 0 && (
          <Disclosure title="Cardio: distance and pace">
            {[...cardioByActivity.entries()].map(([id, c]) => (
              <div key={id} className="flex flex-col gap-2">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <ActivityDot activity={c} /> {c.name}
                </p>
                <p className="text-sm text-ink-muted">
                  {formatKm(Math.round(c.km * 10) / 10)} in the last year
                  {c.best !== null && !/cycl|bike|fiets/i.test(c.name) && ` · best pace ${formatPace(c.best)}`}
                </p>
                {c.points.length > 1 && !/cycl|bike|fiets/i.test(c.name) && <TrendChart points={c.points} format="pace" invert />}
              </div>
            ))}
          </Disclosure>
        )}

        {bests.length > 0 && (
          <Disclosure title="Exercises: records">
            <ul className="flex flex-col gap-4">
              {bests.map((b) => (
                <li key={b.exerciseId} className="flex flex-col gap-1">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">{b.name}</span>
                    <span className="text-sm text-ink-muted">{b.sessions}× · last {formatDay(b.lastOn)}</span>
                  </p>
                  <p className="text-sm text-ink-muted">
                    🏆 {b.measure === "time" ? formatSeconds(b.bestSet) : `${b.bestSet} reps`} in one set ({formatDay(b.bestSetOn)})
                    {b.measure === "reps" && ` · ${b.bestSession} in one session`}
                  </p>
                  {b.history.length > 2 && (
                    <TrendChart points={b.history.map((h) => ({ date: h.date, value: h.best }))} format={b.measure === "time" ? "seconds" : "reps"} height={120} />
                  )}
                </li>
              ))}
            </ul>
          </Disclosure>
        )}

        {past.length > 0 && (
          <Disclosure title="By weekday">
            <ul className="flex flex-col gap-2">
              {weekday.map((n, i) => (
                <li key={WEEKDAYS[i]} className="flex items-center gap-3 text-sm">
                  <span className="w-9 text-ink-muted">{WEEKDAYS[i]}</span>
                  <span className="h-3 flex-1 rounded-full bg-surface-muted">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / topDay) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right font-mono tabular-nums text-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </Disclosure>
        )}

        {trend && (
          <Disclosure title="Body weight">
            <p className="text-sm text-ink-muted">
              Now {formatKg(trend.latest.kg)} · 7-day average {formatKg(trend.average7)}
              {trend.change30 !== null && ` · ${formatChange(trend.change30)} in 30 days`}
              {trend.change90 !== null && ` · ${formatChange(trend.change90)} in 90 days`}
            </p>
            {weights.length > 1 && <TrendChart points={weights.map((w) => ({ date: w.date, value: w.kg }))} format="kg" />}
            <WeightList weighIns={weights} />
          </Disclosure>
        )}
      </div>
    </div>
  );
}
