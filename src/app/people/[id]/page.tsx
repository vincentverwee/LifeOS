import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroups, getPeopleNames, getPerson } from "@/lib/data/people";
import { getTodayKey } from "@/lib/today";
import { describeCountdown, formatBirthday } from "@/lib/people/birthdays";
import { Disclosure } from "@/components/Disclosure";
import { AddGiftForm } from "@/components/people/AddGiftForm";
import { GiftItem } from "@/components/people/GiftItem";
import { FactList } from "@/components/people/FactList";
import { NoteList } from "@/components/people/NoteList";
import { SeenCard } from "@/components/people/SeenCard";
import { LinkList } from "@/components/people/LinkList";
import { TrackToggle } from "@/components/people/TrackToggle";
import type { GiftRow } from "@/lib/data/people";
import { formatDay } from "@/lib/reminders/schedule";

/** Given gifts by the year they were given, newest year first (they arrive newest first). */
function byYear(gifts: GiftRow[]): [string, GiftRow[]][] {
  const years = new Map<string, GiftRow[]>();
  for (const gift of gifts) {
    const year = gift.givenOn!.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), gift]);
  }
  return [...years];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const todayKey = await getTodayKey();
  const [person, people, groups] = await Promise.all([getPerson(id, todayKey), getPeopleNames(), getGroups()]);
  if (!person) notFound();

  const open = person.gifts.filter((g) => g.status !== "given");
  const given = person.gifts.filter((g) => g.status === "given");
  const { birthday, next } = person;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/people" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ People
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold break-words text-foreground">{person.name}</h1>
            {(person.relationToMe || person.groupName) && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {person.relationToMe && (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm text-primary-foreground">
                    Your {person.relationToMe}
                  </span>
                )}
                {person.groupName && (
                  <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-sm text-ink-muted">{person.groupName}</span>
                )}
              </div>
            )}
          </div>
          <Link href={`/people/${person.id}/edit`} className="btn btn-outline inline-flex min-h-11 shrink-0 px-4 text-sm">
            Edit
          </Link>
        </div>
      </div>

      {birthday && next ? (
        <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="text-sm opacity-80">
            {next.daysUntil === 0 ? "It's their birthday" : "Birthday"} · {formatBirthday(birthday)}
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {next.daysUntil === 0 ? "🎂 Today" : describeCountdown(next.daysUntil, next.nextOn)}
            {next.turning !== null && <span className="text-lg font-normal opacity-80"> · turns {next.turning}</span>}
          </p>
        </div>
      ) : null}

      {/* Only for people you track or want to stay in touch with: you might message
          the others every day anyway. */}
      <TrackToggle personId={person.id} on={person.tracked} locked={person.seeEveryDays !== null} />
      {person.tracked && (
        <SeenCard
          personId={person.id}
          name={person.name}
          recentContacts={person.recentContacts}
          seeEveryDays={person.seeEveryDays}
          catchUp={person.catchUp}
          tripContactOn={person.tripContactOn}
          todayKey={todayKey}
        />
      )}

      {(!birthday || person.seeEveryDays === null) && (
        <div className="-mx-3 -my-4 flex flex-wrap">
          {!birthday && (
            <Link href={`/people/${person.id}/edit`} className="btn btn-ghost inline-flex min-h-11 px-3 text-sm">
              + Add their birthday
            </Link>
          )}
          {person.seeEveryDays === null && (
            <Link href={`/people/${person.id}/edit#keep-in-touch`} className="btn btn-ghost inline-flex min-h-11 px-3 text-sm">
              + Keep in touch
            </Link>
          )}
        </div>
      )}

      <Section title="Things to remember">
        <FactList personId={person.id} facts={person.facts} />
      </Section>

      <Section title="Family & friends">
        <LinkList
          personId={person.id}
          name={person.name}
          relationToMe={person.relationToMe}
          links={person.links}
          people={people}
          groups={groups}
        />
      </Section>

      {person.trips.length > 0 && (
        <Section title="Trips together">
          <ul className="flex flex-col gap-2">
            {person.trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/waypoint/trips/${trip.id}`}
                  className="tap flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 hover:border-primary"
                >
                  <span className="min-w-0 truncate font-medium text-foreground">{trip.title}</span>
                  {trip.startDate && (
                    <span className="shrink-0 text-sm text-ink-muted">
                      {formatDay(trip.startDate)}
                      {trip.endDate && trip.endDate !== trip.startDate && ` – ${formatDay(trip.endDate)}`}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Notes">
        <NoteList personId={person.id} notes={person.notes} todayKey={todayKey} />
      </Section>

      <Section title="Gift ideas">
        {open.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {open.map((gift) => (
              <GiftItem key={gift.id} gift={gift} todayKey={todayKey} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No ideas yet. Jot one down when it comes to you.</p>
        )}
        <AddGiftForm personId={person.id} />
        {given.length > 0 && (
          <Disclosure title={`Given (${given.length})`}>
            {byYear(given).map(([year, gifts]) => (
              <div key={year} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-ink-muted">{year}</h3>
                <ul className="flex flex-col gap-2">
                  {gifts.map((gift) => (
                    <GiftItem key={gift.id} gift={gift} todayKey={todayKey} />
                  ))}
                </ul>
              </div>
            ))}
          </Disclosure>
        )}
      </Section>
    </div>
  );
}
