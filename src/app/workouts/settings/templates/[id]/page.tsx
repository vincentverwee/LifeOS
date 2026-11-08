import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivities, getExercises, getTemplate } from "@/lib/data/workouts";
import { TemplateForm } from "@/components/workouts/TemplateForm";

export const metadata = { title: "Edit template" };

export default async function EditTemplatePage({ params }: PageProps<"/workouts/settings/templates/[id]">) {
  const { id } = await params;
  const [template, activities, exercises] = await Promise.all([getTemplate(id), getActivities(), getExercises()]);
  if (!template) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/workouts/settings" className="btn btn-ghost -ml-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Settings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{template.name}</h1>
      </div>
      <TemplateForm template={template} activities={activities} exercises={exercises} />
    </div>
  );
}
