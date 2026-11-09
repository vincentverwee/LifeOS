import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActivities, getExercises, getGoal, getTemplates } from "@/lib/data/workouts";
import { ActivityManager, ExerciseManager, GoalPicker } from "@/components/workouts/SettingsParts";

export const metadata = { title: "Workout settings" };

export default async function WorkoutSettingsPage() {
  const [goal, templates, activities, exercises] = await Promise.all([getGoal(), getTemplates(), getActivities(), getExercises()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" back={{ href: "/workouts", label: "Workouts" }} />

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Weekly goal</h2>
        <GoalPicker goal={goal} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="section-title">Templates</h2>
          <Link href="/workouts/settings/templates/new" className="btn btn-ghost -mr-3 inline-flex min-h-11 px-3 text-sm">
            + New
          </Link>
        </div>
        {templates.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Save a routine (&ldquo;Morning core&rdquo;) to start sessions with its exercises filled in. You can also save any finished workout as one.
          </p>
        ) : (
          <ul className="flex flex-col">
            {templates.map((t) => (
              <li key={t.id}>
                <Link href={`/workouts/settings/templates/${t.id}`} className="tap -mx-3 flex min-h-14 items-center gap-3 rounded-xl px-3 hover:bg-surface-muted">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-foreground">{t.name}</span>
                    <span className="truncate text-sm text-ink-muted">
                      {t.activity.name}
                      {t.exercises.length > 0 && ` · ${t.exercises.map((e) => e.exerciseName).join(", ")}`}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-ink-muted">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Activities</h2>
        <p className="-mt-2 text-sm text-ink-muted">Cardio asks for a distance, bodyweight for exercises, a sport just for the time.</p>
        <ActivityManager activities={activities} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Exercises</h2>
        <ExerciseManager exercises={exercises} />
      </section>
    </div>
  );
}
