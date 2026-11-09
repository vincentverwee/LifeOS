import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActivities, getExercises, getLastSets, getPlaces, getWorkout } from "@/lib/data/workouts";
import { getPeopleNames } from "@/lib/data/people";
import { getTimeZone, dayKeyIn } from "@/lib/today";
import { timeOfDayIn } from "@/lib/workouts/time";
import { WorkoutForm } from "@/components/workouts/WorkoutForm";

export const metadata = { title: "Edit workout" };

export default async function EditWorkoutPage({ params }: PageProps<"/workouts/[id]/edit">) {
  const { id } = await params;
  const tz = await getTimeZone();
  const [workout, activities, exercises, lastSets, people, places] = await Promise.all([
    getWorkout(id),
    getActivities(),
    getExercises(),
    getLastSets(),
    getPeopleNames(),
    getPlaces(),
  ]);
  if (!workout) notFound();
  if (!workout.endedAt) redirect("/workouts/session");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit workout" back={{ href: `/workouts/${workout.id}`, label: workout.activity.name }} />
      <WorkoutForm
        activities={activities}
        exercises={exercises}
        lastSets={lastSets}
        everyone={people}
        places={places}
        todayKey={dayKeyIn(tz)}
        nowTime={timeOfDayIn(new Date(), tz)}
        workout={workout}
      />
    </div>
  );
}
