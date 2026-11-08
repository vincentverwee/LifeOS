import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSetLites, getWorkout } from "@/lib/data/workouts";
import { getTodayKey } from "@/lib/today";
import { describeDoneOn } from "@/lib/reminders/schedule";
import { moodOf } from "@/lib/diary/onThisDay";
import { describeTempo } from "@/lib/workouts/stats";
import { partOfDay } from "@/lib/workouts/time";
import { effortLabel, formatKm, formatMinutes, formatSet, groupSets } from "@/lib/workouts/types";
import { ActivityDot } from "@/components/workouts/ui";
import { WorkoutActions } from "@/components/workouts/WorkoutActions";

export const metadata = { title: "Workout" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2.5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export default async function WorkoutPage({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  const [workout, todayKey, allSets] = await Promise.all([getWorkout(id), getTodayKey(), getSetLites()]);
  if (!workout) notFound();
  if (!workout.endedAt) redirect("/workouts/session");

  const feel = moodOf(workout.feel);
  const tempo = workout.durationMin ? describeTempo(workout.activity.name, workout.distanceKm, workout.durationMin) : null;
  // A set is a record when it beats every set of that exercise from before this day.
  const earlierBest = (exerciseId: string) => {
    const earlier = allSets.filter((s) => s.exerciseId === exerciseId && s.workoutId !== workout.id && s.date < workout.date);
    return earlier.length ? Math.max(...earlier.map((s) => s.value)) : null;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/workouts/log" className="btn btn-ghost -ml-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Log
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-foreground">
          <ActivityDot activity={workout.activity} className="h-3 w-3" />
          {workout.activity.name}
          {feel && (
            <span aria-label={feel.label} title={feel.label}>
              {feel.face}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {describeDoneOn(workout.date, todayKey)} · {partOfDay(workout.time).toLowerCase()} at {workout.time}
          {workout.templateName && ` · ${workout.templateName}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {workout.durationMin && <Stat label="Time" value={formatMinutes(workout.durationMin)} />}
        {workout.distanceKm && <Stat label="Distance" value={formatKm(workout.distanceKm)} />}
        {tempo && <Stat label={tempo.endsWith("km/h") ? "Speed" : "Pace"} value={tempo} />}
        {workout.effort && <Stat label="Effort" value={effortLabel(workout.effort) ?? ""} />}
      </div>

      {workout.sets.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Exercises</h2>
          <ul className="flex flex-col gap-2">
            {groupSets(workout.sets).map((group) => {
              const best = earlierBest(group[0].exerciseId);
              const top = Math.max(...group.map((s) => s.seconds ?? s.reps ?? 0));
              const record = best !== null && top > best;
              return (
                <li key={group[0].exerciseId} className="rounded-xl border border-border p-3">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    {group[0].exerciseName}
                    {record && <span className="rounded-full bg-tag-yellow/20 px-2 py-0.5 text-xs font-semibold text-foreground">🏆 Record</span>}
                  </p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-ink-muted">
                    {group.map((s) => formatSet(s)).join(" · ")}
                    {group[0].measure === "reps" && ` = ${group.reduce((n, s) => n + (s.reps ?? 0), 0)} reps`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(workout.place || workout.people.length > 0 || workout.note) && (
        <section className="flex flex-col gap-2 text-sm">
          {workout.place && (
            <p>
              <span className="text-ink-muted">Where · </span>
              {workout.place}
            </p>
          )}
          {workout.people.length > 0 && (
            <p>
              <span className="text-ink-muted">With · </span>
              {workout.people.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ", "}
                  <Link href={`/people/${p.id}`} className="text-primary underline">
                    {p.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
          {workout.note && <p className="whitespace-pre-line text-foreground">{workout.note}</p>}
        </section>
      )}

      <WorkoutActions id={workout.id} hasSets={workout.sets.length > 0} suggestedName={workout.templateName ? `${workout.templateName} 2` : workout.activity.name} />
    </div>
  );
}
