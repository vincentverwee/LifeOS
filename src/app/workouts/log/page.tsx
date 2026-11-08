import Link from "next/link";
import { getActivities, getWorkouts } from "@/lib/data/workouts";
import { getTodayKey } from "@/lib/today";
import { parseDateKey } from "@/lib/format";
import { addDays } from "@/lib/reminders/schedule";
import { totals } from "@/lib/workouts/stats";
import { formatKm, formatMinutes, type WorkoutView } from "@/lib/workouts/types";
import { ActivityDot, WorkoutRow } from "@/components/workouts/ui";
import { ADD_HREF } from "@/components/workouts/nav";

export const metadata = { title: "Workout log" };

const PAGE = 40;
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

function byMonth(workouts: WorkoutView[]): [string, WorkoutView[]][] {
  const groups = new Map<string, WorkoutView[]>();
  for (const w of workouts) groups.set(w.date.slice(0, 7), [...(groups.get(w.date.slice(0, 7)) ?? []), w]);
  return [...groups.entries()];
}

export default async function WorkoutLogPage({ searchParams }: PageProps<"/workouts/log">) {
  const sp = await searchParams;
  const before = parseDateKey(sp.before);
  const activityId = typeof sp.activity === "string" ? sp.activity : undefined;
  const [todayKey, activities] = await Promise.all([getTodayKey(), getActivities()]);
  // One extra tells whether there's an older page.
  const rows = await getWorkouts({ to: before ? addDays(before, -1) : undefined, activityId, take: PAGE + 1 });
  const workouts = rows.slice(0, PAGE);
  const older = rows.length > PAGE ? workouts.at(-1)?.date : null;
  const used = activities.filter((a) => a.workoutCount > 0);
  const href = (q: { activity?: string; before?: string }) => {
    const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]);
    return `/workouts/log${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold text-foreground">Log</h1>

      {used.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link
            href={href({})}
            className={`btn inline-flex min-h-11 shrink-0 px-4 text-sm ${!activityId ? "bg-primary text-primary-foreground" : "btn-outline"}`}
          >
            All
          </Link>
          {used.map((a) => (
            <Link
              key={a.id}
              href={href({ activity: a.id })}
              className={`btn inline-flex min-h-11 shrink-0 gap-2 px-4 text-sm ${activityId === a.id ? "bg-primary text-primary-foreground" : "btn-outline"}`}
            >
              <ActivityDot activity={a} />
              {a.name}
            </Link>
          ))}
        </div>
      )}

      {workouts.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-ink-muted">{before ? "Nothing older." : "No workouts yet."}</p>
          <Link href={ADD_HREF} className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
            Log a workout
          </Link>
        </div>
      ) : (
        byMonth(workouts).map(([month, list]) => {
          const t = totals(list.map((w) => ({ durationMin: w.durationMin ?? 0, distanceKm: w.distanceKm })));
          return (
            <section key={month} className="flex flex-col gap-1">
              <h2 className="flex items-baseline justify-between gap-2 px-3">
                <span className="font-semibold text-foreground">{monthFormatter.format(new Date(`${month}-01T00:00:00Z`))}</span>
                <span className="text-xs text-ink-muted">
                  {t.sessions} · {formatMinutes(t.minutes)}
                  {t.km > 0 && ` · ${formatKm(t.km)}`}
                </span>
              </h2>
              <ul className="flex flex-col">
                {list.map((w) => (
                  <WorkoutRow key={w.id} workout={w} todayKey={todayKey} />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {older && (
        <Link href={href({ activity: activityId, before: older })} className="btn btn-outline inline-flex min-h-11 self-center px-5 text-sm">
          Older
        </Link>
      )}
    </div>
  );
}
