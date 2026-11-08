import Link from "next/link";
import { getActivities, getExercises } from "@/lib/data/workouts";
import { TemplateForm } from "@/components/workouts/TemplateForm";

export const metadata = { title: "New template" };

export default async function NewTemplatePage() {
  const [activities, exercises] = await Promise.all([getActivities(), getExercises()]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/workouts/settings" className="btn btn-ghost -ml-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Settings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">New template</h1>
      </div>
      <TemplateForm activities={activities} exercises={exercises} />
    </div>
  );
}
