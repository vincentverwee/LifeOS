import Link from "next/link";
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
      <div>
        <Link href={`/people/${person.id}`} className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ {person.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Edit</h1>
      </div>

      <PersonForm person={person} groups={groups} />

      <ConfirmDeleteButton action={deletePerson} id={person.id} title={person.name} label="Delete (with notes and gifts)" />
    </div>
  );
}
