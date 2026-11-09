import { PageHeader } from "@/components/ui/PageHeader";
import { getActivities, getExercises } from "@/lib/data/workouts";
import { TemplateForm } from "@/components/workouts/TemplateForm";

export const metadata = { title: "New template" };

export default async function NewTemplatePage() {
  const [activities, exercises] = await Promise.all([getActivities(), getExercises()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New template" back={{ href: "/workouts/settings", label: "Settings" }} />
      <TemplateForm activities={activities} exercises={exercises} />
    </div>
  );
}
