import { PageHeader } from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { getActivities, getExercises, getTemplate } from "@/lib/data/workouts";
import { TemplateForm } from "@/components/workouts/TemplateForm";

export const metadata = { title: "Edit template" };

export default async function EditTemplatePage({ params }: PageProps<"/workouts/settings/templates/[id]">) {
  const { id } = await params;
  const [template, activities, exercises] = await Promise.all([getTemplate(id), getActivities(), getExercises()]);
  if (!template) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={template.name} back={{ href: "/workouts/settings", label: "Settings" }} />
      <TemplateForm template={template} activities={activities} exercises={exercises} />
    </div>
  );
}
