import Link from "next/link";
import { getActivities, getExercises, getLastSets, getPlaces } from "@/lib/data/workouts";
import { getPeopleNames } from "@/lib/data/people";
import { getTimeZone, dayKeyIn } from "@/lib/today";
import { timeOfDayIn } from "@/lib/workouts/time";
import { WorkoutForm } from "@/components/workouts/WorkoutForm";

export const metadata = { title: "Log a workout" };

export default async function AddWorkoutPage() {
  const tz = await getTimeZone();
  const [activities, exercises, lastSets, people, places] = await Promise.all([
    getActivities(),
    getExercises(),
    getLastSets(),
    getPeopleNames(),
    getPlaces(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Log a workout</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Done already? Fill it in here. Training now? <Link href="/workouts" className="text-primary underline">Start a session</Link> instead.
        </p>
      </div>
      <WorkoutForm
        activities={activities}
        exercises={exercises}
        lastSets={lastSets}
        everyone={people}
        places={places}
        todayKey={dayKeyIn(tz)}
        nowTime={timeOfDayIn(new Date(), tz)}
      />
    </div>
  );
}
