import { redirect } from "next/navigation";
import { getExercises, getLiveWorkout, getPlaces, getTemplate } from "@/lib/data/workouts";
import { getPeopleNames } from "@/lib/data/people";
import { LiveSession } from "@/components/workouts/LiveSession";

export const metadata = { title: "Session" };

/** The running workout; without one, back to Today (where sessions start). */
export default async function SessionPage() {
  const live = await getLiveWorkout();
  if (!live) redirect("/workouts");
  const [exercises, places, people, template] = await Promise.all([
    getExercises(),
    getPlaces(),
    getPeopleNames(),
    live.workout.templateId ? getTemplate(live.workout.templateId) : null,
  ]);
  const restFor = Object.fromEntries((template?.exercises ?? []).map((e) => [e.exerciseId, e.restSeconds]));
  return (
    <LiveSession
      workout={live.workout}
      restUntil={live.restUntil}
      exercises={exercises}
      restFor={restFor}
      places={places}
      everyone={people.map(({ id, name }) => ({ id, name }))}
    />
  );
}
