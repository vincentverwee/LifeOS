import Link from "next/link";
import { connection } from "next/server";
import { getGroups, getTrackDefault } from "@/lib/data/people";
import { PersonForm } from "@/components/people/PersonForm";

export default async function AddPersonPage() {
  await connection(); // reads the DB: render per request, not at build time
  const [groups, trackDefault] = await Promise.all([getGroups(), getTrackDefault()]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/people" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ People
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Add someone</h1>
      </div>
      <PersonForm groups={groups} trackDefault={trackDefault} />
    </div>
  );
}
