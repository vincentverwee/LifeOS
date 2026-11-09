import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActivities, getBodyWeights, getLiveWorkout, getTemplates, getWorkouts, getWorkoutsGlance } from "@/lib/data/workouts";
import { getSectionMood } from "@/lib/data/homeMoods";
import { getTimeZone, dayKeyIn } from "@/lib/today";
import { hourIn } from "@/components/home/TileBodies";
import { mascotName } from "@/lib/mascots";
import { THEME } from "@/lib/theme";
import { LiveMascot } from "@/components/home/LiveMascot";
import { StartPanel } from "@/components/workouts/StartPanel";
import { WeightCard } from "@/components/workouts/WeightCard";
import { WeekDots, WorkoutRow } from "@/components/workouts/ui";
import { ElapsedClock } from "@/components/workouts/ElapsedClock";

export const metadata = { title: "Workouts" };

const RECENT = 5;

export default async function WorkoutsPage() {
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const [glance, live, templates, activities, recent, weights, mood] = await Promise.all([
    getWorkoutsGlance(todayKey),
    getLiveWorkout(),
    getTemplates(),
    getActivities(),
    getWorkouts({ take: RECENT }),
    getBodyWeights(),
    getSectionMood("workouts", todayKey, hourIn(tz)),
  ]);
  const { week, streak } = glance;
  const coach = mascotName("workouts", THEME);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workouts"
        subtitle={coach}
        section="workouts"
        mascot={<LiveMascot kind="workouts" mood={mood.mood} name={coach} line={mood.line} size={42} badge />}
      />

      {live && (
        <Link
          href="/workouts/session"
          className="tap flex items-center gap-4 rounded-2xl border-2 border-primary bg-surface p-5 hover:bg-surface-muted"
        >
          <span className="flex flex-1 flex-col">
            <span className="text-sm font-medium text-primary">Session running</span>
            <span className="text-xl font-semibold text-foreground">{live.workout.activity.name}</span>
            <span className="text-sm text-ink-muted">
              {live.workout.sets.filter((s) => s.done).length} of {live.workout.sets.length} sets done
            </span>
          </span>
          <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            <ElapsedClock since={live.workout.startedAt} />
          </span>
          <span aria-hidden="true" className="text-xl text-ink-muted">
            ›
          </span>
        </Link>
      )}

      <section className="card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
            {week.done}
            {week.goal !== null && <span className="text-lg text-ink-muted"> / {week.goal}</span>}
            <span className="text-lg text-ink-muted"> this week</span>
          </p>
          {streak > 0 && (
            <span className="shrink-0 text-sm font-medium text-foreground">
              🔥 {streak} {streak === 1 ? "week" : "weeks"}
            </span>
          )}
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          {week.goal === null ? (
            <>
              No weekly goal yet ·{" "}
              <Link href="/workouts/settings" className="text-primary underline">
                set one
              </Link>
            </>
          ) : week.met ? (
            "Goal met. Anything more is a bonus."
          ) : week.behind && !week.reachable ? (
            `${week.left} to go — a tough one this week. Next week counts again.`
          ) : (
            `${week.left} to go · ${week.daysLeft} ${week.daysLeft === 1 ? "day" : "days"} left`
          )}
        </p>
        <WeekDots week={week} todayKey={todayKey} />
      </section>

      {!live && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Train now</h2>
          <StartPanel templates={templates} activities={activities} />
        </section>
      )}

      <section className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between px-3">
          <h2 className="section-title">Latest</h2>
          {recent.length > 0 && (
            <Link href="/workouts/log" className="btn btn-ghost -mr-3 inline-flex min-h-11 px-3 text-sm">
              All ›
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
            Nothing yet. Start a session above, or{" "}
            <Link href="/workouts/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
              log one you did
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col">
            {recent.map((w) => (
              <WorkoutRow key={w.id} workout={w} todayKey={todayKey} />
            ))}
          </ul>
        )}
      </section>

      <WeightCard weighIns={weights} todayKey={todayKey} />
    </div>
  );
}
