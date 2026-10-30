import "server-only";
import { prisma } from "@/lib/prisma";
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

export type PersonDetail = PersonSummary & {
  facts: FactRow[];
  notes: NoteRow[];
  gifts: GiftRow[];
  /** Latest contact days first, a handful. */
  recentContacts: Contact[];
  /** People they're linked to, A–Z. */
  links: (LinkView & { otherName: string; otherGroup: string | null })[];
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

/** Everyone, A–Z. */
export async function getPeople(todayKey: string): Promise<PersonSummary[]> {
  const rows = await prisma.person.findMany({
    select: {
      ...SUMMARY_SELECT,
      seen: { orderBy: [{ seenOn: "desc" }, { createdAt: "desc" }], take: 1, select: { seenOn: true, kind: true } },
      _count: { select: { gifts: { where: { status: { not: "given" } } } } },
    },
  });
  return rows
    .map((row) => toSummary(row, row.seen[0], row._count.gifts, todayKey))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

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
  return {
    ...toSummary(row, row.seen[0], gifts.filter((g) => g.status !== "given").length, todayKey),
    facts: row.facts,
    notes: row.notes.map((n) => ({ id: n.id, date: dayKey(n.date), text: n.text })),
    gifts,
    recentContacts: row.seen.map((s) => ({ day: dayKey(s.seenOn), kind: toKind(s.kind) })),
    links,
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
