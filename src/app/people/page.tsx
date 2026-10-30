import Link from "next/link";
import { byNextBirthday, getGroups, getPeople, getPeopleWeb } from "@/lib/data/people";
import { getTodayKey } from "@/lib/today";
import { describeCountdown, SOON_DAYS } from "@/lib/people/birthdays";
import { PeopleList } from "@/components/people/PeopleList";
import { PeopleWeb } from "@/components/people/PeopleWeb";
import { Disclosure } from "@/components/Disclosure";

export default async function PeoplePage() {
  const todayKey = await getTodayKey();
  const [people, groups, web] = await Promise.all([getPeople(todayKey), getGroups(), getPeopleWeb()]);
  const birthdays = byNextBirthday(people).filter((p) => p.next.daysUntil < SOON_DAYS);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Home
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">People</h1>
          <Link href="/people/add" className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
            + Add
          </Link>
        </div>
      </div>

      {birthdays.length > 0 && (
        <section className="rounded-2xl bg-primary p-4 text-primary-foreground">
          <h2 className="text-sm font-medium opacity-80">Birthdays coming up</h2>
          <ul className="mt-2 flex flex-col">
            {birthdays.map((p) => (
              <li key={p.id}>
                <Link href={`/people/${p.id}`} className="-mx-2 flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-primary-foreground/10">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {p.next.daysUntil === 0 && "🎂 "}
                    {p.name}
                    {p.next.turning !== null && <span className="font-normal opacity-80"> · turns {p.next.turning}</span>}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{describeCountdown(p.next.daysUntil, p.next.nextOn)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {people.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          No one here yet.{" "}
          <Link href="/people/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Add someone
          </Link>
        </p>
      ) : (
        <PeopleList people={people} groups={groups} todayKey={todayKey} />
      )}

      {web.edges.length > 0 && (
        <Disclosure title="Who knows who">
          <PeopleWeb nodes={web.nodes} edges={web.edges} />
        </Disclosure>
      )}
    </div>
  );
}
