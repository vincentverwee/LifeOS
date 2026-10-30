import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/waypoint/uuid";
import { dayKey } from "@/lib/format";
import { birthdayOf, isGiftStatus, SOON_DAYS, upcoming, type Birthday, type GiftStatus, type Upcoming } from "@/lib/people/birthdays";
import { isDue } from "@/lib/reminders/routines";
import { viewLink, type LinkView } from "@/lib/people/links";
import type { WebEdge, WebNode } from "@/lib/people/web";
import { familyLevel } from "@/lib/people/family";

export type PersonSummary = {
  id: string;
  name: string;
  groupName: string | null;
  /** What they are to you ("mum"). */
  relationToMe: string | null;
  birthday: Birthday | null;
  /** Next birthday; null without one. */
  next: Upcoming | null;
  seeEveryDays: number | null;
  /** Saw them / Messaged is shown: ticked "Track", or a keep-in-touch interval. */
  tracked: boolean;
  /** The "Track" tick itself. */
  trackContact: boolean;
  /** Newest day seen or messaged ("YYYY-MM-DD"), null = never logged. */
  lastContactOn: string | null;
  lastContactKind: ContactKind | null;
  /** Past their "catch up every N days" (or never in touch while they have one). */
  catchUp: boolean;
  /** Gifts still to give (ideas + bought). */
  openGifts: number;
};

export type GiftRow = {
  id: string;
  title: string;
  status: GiftStatus;
  price: number | null;
  link: string | null;
  occasion: string | null;
  /** "YYYY-MM-DD", set once given */
  givenOn: string | null;
};

export type FactRow = { id: string; label: string; value: string };
export type NoteRow = { id: string; /** "YYYY-MM-DD" */ date: string; text: string };

export type TripTogether = { id: string; title: string; startDate: string | null; endDate: string | null };

const TRIP_SELECT = { select: { trip: { select: { startDate: true, endDate: true } } } } as const;

type TripDates = { trip: { startDate: Date | null; endDate: Date | null } };

/**
 * What shared trips count as: the newest trip's last day (or first, without an end) once it
 * has started; a trip still going counts as today. Null = no started trip.
 */
function lastTripDay(trips: TripDates[], todayKey: string): Date | null {
  const today = new Date(`${todayKey}T00:00:00Z`);
  let best: Date | null = null;
  for (const { trip } of trips) {
    const start = trip.startDate ?? trip.endDate;
    if (!start || dayKey(start) > todayKey) continue;
    const end = trip.endDate ?? start;
    const day = dayKey(end) > todayKey ? today : end;
    if (!best || day > best) best = day;
  }
  return best;
}

/** The newest seen/message day or trip day, whichever is later (a trip counts as "seen"). */
function lastContact(
  seen: { seenOn: Date; kind: string } | undefined,
  trips: TripDates[],
  todayKey: string
): { seenOn: Date; kind: string } | undefined {
  const tripDay = lastTripDay(trips, todayKey);
  if (tripDay && (!seen || tripDay > seen.seenOn)) return { seenOn: tripDay, kind: "seen" };
  return seen;
}

export type PersonDetail = PersonSummary & {
  facts: FactRow[];
  notes: NoteRow[];
  gifts: GiftRow[];
  /** Latest contact days first, a handful. */
  recentContacts: Contact[];
  /** People they're linked to, A–Z. */
  links: (LinkView & { otherName: string; otherGroup: string | null })[];
  /** Waypoint trips they came on, newest first. */
  trips: TripTogether[];
  /** The day shared trips count as "seen" ("YYYY-MM-DD"; a trip still going = today), null = none. */
  tripContactOn: string | null;
};

const RECENT_CONTACTS = 8;

export type ContactKind = "seen" | "message";
export type Contact = { /** "YYYY-MM-DD" */ day: string; kind: ContactKind };

const toKind = (kind: string): ContactKind => (kind === "message" ? "message" : "seen");

const SUMMARY_SELECT = {
  id: true,
  name: true,
  groupName: true,
  relationToMe: true,
  birthMonth: true,
  birthDay: true,
  birthYear: true,
  seeEveryDays: true,
  trackContact: true,
} as const;

type SummaryRow = {
  id: string;
  name: string;
  groupName: string | null;
  relationToMe: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  seeEveryDays: number | null;
  trackContact: boolean;
};

function toSummary(
  row: SummaryRow,
  last: { seenOn: Date; kind: string } | undefined,
  openGifts: number,
  todayKey: string
): PersonSummary {
  const birthday = birthdayOf(row);
  const lastContactOn = last ? dayKey(last.seenOn) : null;
  return {
    id: row.id,
    name: row.name,
    groupName: row.groupName,
    relationToMe: row.relationToMe,
    birthday,
    next: birthday ? upcoming(birthday, todayKey) : null,
    seeEveryDays: row.seeEveryDays,
    tracked: row.trackContact || row.seeEveryDays !== null,
    trackContact: row.trackContact,
    lastContactOn,
    lastContactKind: last ? toKind(last.kind) : null,
    catchUp: isDue({ everyDays: row.seeEveryDays, lastDoneOn: lastContactOn }, todayKey),
    openGifts,
  };
}

/** Everyone, A–Z. Cached per request: Home asks for it twice (Reminders and People tiles). */
export const getPeople = cache(async (todayKey: string): Promise<PersonSummary[]> => {
  const rows = await prisma.person.findMany({
    select: {
      ...SUMMARY_SELECT,
      seen: { orderBy: [{ seenOn: "desc" }, { createdAt: "desc" }], take: 1, select: { seenOn: true, kind: true } },
      trips: TRIP_SELECT,
      _count: { select: { gifts: { where: { status: { not: "given" } } } } },
    },
  });
  return rows
    .map((row) => toSummary(row, lastContact(row.seen[0], row.trips, todayKey), row._count.gifts, todayKey))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
});

/** People with a birthday, the next one first. */
export function byNextBirthday(people: PersonSummary[]): (PersonSummary & { next: Upcoming })[] {
  return people
    .filter((p): p is PersonSummary & { next: Upcoming } => p.next !== null)
    .sort((a, b) => a.next.daysUntil - b.next.daysUntil || a.name.localeCompare(b.name));
}

export async function getPerson(id: string, todayKey: string): Promise<PersonDetail | null> {
  const row = await prisma.person.findUnique({
    where: { id },
    select: {
      ...SUMMARY_SELECT,
      facts: { orderBy: { createdAt: "asc" }, select: { id: true, label: true, value: true } },
      notes: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], select: { id: true, date: true, text: true } },
      gifts: { orderBy: [{ givenOn: { sort: "desc", nulls: "first" } }, { createdAt: "asc" }] },
      seen: { orderBy: [{ seenOn: "desc" }, { createdAt: "desc" }], take: RECENT_CONTACTS, select: { seenOn: true, kind: true } },
      trips: { select: { trip: { select: { id: true, title: true, startDate: true, endDate: true } } } },
    },
  });
  if (!row) return null;
  const linkRows = await prisma.personLink.findMany({
    where: { OR: [{ aId: id }, { bId: id }] },
    select: {
      id: true,
      aId: true,
      bId: true,
      aLabel: true,
      bLabel: true,
      a: { select: { name: true, groupName: true } },
      b: { select: { name: true, groupName: true } },
    },
  });
  const links = linkRows
    .map((l) => {
      const other = l.aId === id ? l.b : l.a;
      return { ...viewLink(l, id), otherName: other.name, otherGroup: other.groupName };
    })
    .sort((x, y) => x.otherName.localeCompare(y.otherName));
  const gifts: GiftRow[] = row.gifts.map((g) => ({
    id: g.id,
    title: g.title,
    status: isGiftStatus(g.status) ? g.status : "idea",
    price: g.price?.toNumber() ?? null,
    link: g.link,
    occasion: g.occasion,
    givenOn: g.givenOn ? dayKey(g.givenOn) : null,
  }));
  const tripDay = lastTripDay(row.trips, todayKey);
  return {
    ...toSummary(row, lastContact(row.seen[0], row.trips, todayKey), gifts.filter((g) => g.status !== "given").length, todayKey),
    facts: row.facts,
    notes: row.notes.map((n) => ({ id: n.id, date: dayKey(n.date), text: n.text })),
    gifts,
    recentContacts: row.seen.map((s) => ({ day: dayKey(s.seenOn), kind: toKind(s.kind) })),
    links,
    trips: row.trips
      .map(({ trip }) => ({
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate ? dayKey(trip.startDate) : null,
        endDate: trip.endDate ? dayKey(trip.endDate) : null,
      }))
      .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")),
    tripContactOn: tripDay ? dayKey(tripDay) : null,
  };
}

/** The groups in use, A–Z, for the filter chips and the form's suggestions. */
export async function getGroups(): Promise<string[]> {
  const rows = await prisma.person.findMany({
    where: { groupName: { not: null } },
    distinct: ["groupName"],
    select: { groupName: true },
  });
  return rows.map((r) => r.groupName!).sort((a, b) => a.localeCompare(b));
}

export type PeopleGlance = {
  total: number;
  /** The next birthday, if anyone has one. */
  nextBirthday: (PersonSummary & { next: Upcoming }) | null;
  /** Birthdays in the next SOON_DAYS days. */
  soon: number;
  /** People past their "see every" nudge. */
  catchUp: PersonSummary[];
};

export async function getPeopleGlance(todayKey: string): Promise<PeopleGlance> {
  const people = await getPeople(todayKey);
  const birthdays = byNextBirthday(people);
  return {
    total: people.length,
    nextBirthday: birthdays[0] ?? null,
    soon: birthdays.filter((p) => p.next.daysUntil < SOON_DAYS).length,
    catchUp: people.filter((p) => p.catchUp),
  };
}

/** People past their catch-up nudge, longest out of touch first: they show on Reminders' To do. */
export async function getCatchUps(todayKey: string): Promise<PersonSummary[]> {
  const people = await getPeople(todayKey);
  return people
    .filter((p) => p.catchUp)
    .sort((a, b) => (a.lastContactOn ?? "").localeCompare(b.lastContactOn ?? "") || a.name.localeCompare(b.name));
}

/** Everyone to pick from when linking, A–Z (names aren't unique, so the picker shows the group too). */
export async function getPeopleNames(): Promise<
  { id: string; name: string; groupName: string | null; relationToMe: string | null }[]
> {
  return prisma.person.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, groupName: true, relationToMe: true },
  });
}

/** The web's node for you; everyone with a `relationToMe` links to it. */
export const ME_NODE = "me";

/** A line in the web; `aIs` = what A is to B, `bIs` = what B is to A (for the tap-to-show labels). */
export type WebLine = WebEdge & { aIs: string | null; bIs: string | null };

/** The "who knows who" web: you, everyone with a link or a relation to you, and the links. */
export async function getPeopleWeb(): Promise<{ nodes: WebNode[]; edges: WebLine[] }> {
  const PERSON = { select: { name: true, groupName: true, relationToMe: true } } as const;
  const [links, related] = await Promise.all([
    prisma.personLink.findMany({ select: { aId: true, bId: true, aLabel: true, bLabel: true, a: PERSON, b: PERSON } }),
    prisma.person.findMany({
      where: { relationToMe: { not: null } },
      select: { id: true, name: true, groupName: true, relationToMe: true },
    }),
  ]);
  const nodes = new Map<string, WebNode>();
  const node = (id: string, p: { name: string; groupName: string | null; relationToMe: string | null }) =>
    nodes.set(id, { id, name: p.name, group: p.groupName, level: familyLevel(p.relationToMe) });
  if (related.length) nodes.set(ME_NODE, { id: ME_NODE, name: "You", group: null, level: 0 });
  for (const p of related) node(p.id, p);
  for (const l of links) {
    node(l.aId, l.a);
    node(l.bId, l.b);
  }
  return {
    nodes: [...nodes.values()].sort((x, y) => x.id.localeCompare(y.id)),
    edges: [
      // You → them: they are your `relationToMe`; what you are to them isn't stored.
      ...related.map((p) => ({ a: ME_NODE, b: p.id, aIs: null, bIs: p.relationToMe })),
      ...links.map((l) => ({ a: l.aId, b: l.bId, aIs: l.aLabel, bIs: l.bLabel })),
    ],
  };
}

/** The add form's "Track" default: whatever the last person added got (on Erasmus, everyone new). */
export async function getTrackDefault(): Promise<boolean> {
  const last = await prisma.person.findFirst({ orderBy: { createdAt: "desc" }, select: { trackContact: true } });
  return last?.trackContact ?? false;
}

/** Who came along on a Waypoint trip, A–Z. */
export async function getTripPeople(tripId: string): Promise<{ id: string; name: string; groupName: string | null }[]> {
  if (!isUuid(tripId)) return [];
  const rows = await prisma.waypointTripPerson.findMany({
    where: { tripId },
    select: { person: { select: { id: true, name: true, groupName: true } } },
  });
  return rows.map((r) => r.person).sort((a, b) => a.name.localeCompare(b.name));
}

/** People tagged on at least one trip (the map's filter chips), A–Z, with the ids of their trips. */
export async function getTripCompanions(): Promise<{ id: string; name: string; groupName: string | null; tripIds: string[] }[]> {
  const rows = await prisma.waypointTripPerson.findMany({
    select: { tripId: true, person: { select: { id: true, name: true, groupName: true } } },
  });
  const byPerson = new Map<string, { id: string; name: string; groupName: string | null; tripIds: string[] }>();
  for (const { tripId, person } of rows) {
    const entry = byPerson.get(person.id) ?? { ...person, tripIds: [] };
    entry.tripIds.push(tripId);
    byPerson.set(person.id, entry);
  }
  return [...byPerson.values()].sort((a, b) => a.name.localeCompare(b.name));
}
