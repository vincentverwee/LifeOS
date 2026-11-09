import { PageHeader } from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { getGroups, getPerson } from "@/lib/data/people";
import { getTodayKey } from "@/lib/today";
import { PersonForm } from "@/components/people/PersonForm";
import { ConfirmDeleteButton } from "@/components/reminders/ConfirmDeleteButton";
import { deletePerson } from "@/lib/actions/people";

export default async function EditPersonPage({ params }: PageProps<"/people/[id]/edit">) {
  const { id } = await params;
  const [person, groups] = await Promise.all([getPerson(id, await getTodayKey()), getGroups()]);
  if (!person) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit" back={{ href: `/people/${person.id}`, label: person.name }} />

      <PersonForm person={person} groups={groups} />

      <ConfirmDeleteButton action={deletePerson} id={person.id} title={person.name} label="Delete (with notes and gifts)" />
    </div>
  );
}
