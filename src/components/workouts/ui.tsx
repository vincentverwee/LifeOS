import Link from "next/link";
import { formatDay } from "@/lib/reminders/schedule";
import { describeWorkout } from "@/lib/workouts/describe";
import type { WeekProgress } from "@/lib/workouts/stats";
import type { ActivityRef, WorkoutView } from "@/lib/workouts/types";
import { moodOf } from "@/lib/diary/onThisDay";

export const FIELD = "field";

/** The activity's palette colour as a small dot. */
export function ActivityDot({ activity, className = "h-2.5 w-2.5" }: { activity: Pick<ActivityRef, "color">; className?: string }) {
  return <span aria-hidden="true" className={`${className} shrink-0 rounded-full`} style={{ backgroundColor: `var(--color-tag-${activity.color})` }} />;
}

/** One workout in a list, linking to its page. */
export function WorkoutRow({ workout, todayKey }: { workout: WorkoutView; todayKey: string }) {
  const feel = moodOf(workout.feel);
  return (
    <li>
      <Link href={`/workouts/${workout.id}`} className="tap flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-muted">
        <ActivityDot activity={workout.activity} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-foreground">
            {workout.activity.name}
            {feel && <span className="ml-1.5" aria-label={feel.label}>{feel.face}</span>}
          </span>
          <span className="truncate text-sm text-ink-muted">{describeWorkout(workout) || workout.time}</span>
        </span>
        <span className="shrink-0 text-right text-xs text-ink-muted">
          {workout.date === todayKey ? "Today" : formatDay(workout.date)}
          <br />
          {workout.time}
        </span>
      </Link>
    </li>
  );
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Mon–Sun: a filled dot per day with a workout, today ringed. */
export function WeekDots({ week, todayKey, size = "h-8 w-8" }: { week: WeekProgress; todayKey: string; size?: string }) {
  return (
    <ol className="flex justify-between gap-1" aria-label="This week">
      {week.days.map((d, i) => {
        const done = d.count > 0;
        const today = d.date === todayKey;
        return (
          <li key={d.date} className="flex flex-col items-center gap-1">
            <span
              className={`${size} flex items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-primary text-primary-foreground" : d.date > todayKey ? "bg-surface-muted text-ink-muted/60" : "bg-surface-muted text-ink-muted"
              } ${today ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}`}
              aria-label={`${formatDay(d.date)}: ${done ? `${d.count} workout${d.count === 1 ? "" : "s"}` : "none"}`}
            >
              {d.count > 1 ? d.count : DAY_LETTERS[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
