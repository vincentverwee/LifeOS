import { PageHeader } from "@/components/ui/PageHeader";
import { connection } from "next/server";
import { getGroups, getTrackDefault } from "@/lib/data/people";
import { PersonForm } from "@/components/people/PersonForm";

export default async function AddPersonPage() {
  await connection(); // reads the DB: render per request, not at build time
  const [groups, trackDefault] = await Promise.all([getGroups(), getTrackDefault()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add someone" back={{ href: "/people", label: "People" }} />
      <PersonForm groups={groups} trackDefault={trackDefault} />
    </div>
  );
}
