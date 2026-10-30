import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { birthdayOf, isGiftStatus, SOON_DAYS, upcoming, type Birthday, type GiftStatus, type Upcoming } from "@/lib/people/birthdays";
import { isDue } from "@/lib/reminders/routines";

export type PersonSummary = {
  id: string;
  name: string;
  groupName: string | null;
  birthday: Birthday | null;
  /** Next birthday; null without one. */
  next: Upcoming | null;
  seeEveryDays: number | null;
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
};

const RECENT_CONTACTS = 8;

export type ContactKind = "seen" | "message";
export type Contact = { /** "YYYY-MM-DD" */ day: string; kind: ContactKind };

const toKind = (kind: string): ContactKind => (kind === "message" ? "message" : "seen");

const SUMMARY_SELECT = {
  id: true,
  name: true,
  groupName: true,
  birthMonth: true,
  birthDay: true,
  birthYear: true,
  seeEveryDays: true,
} as const;

type SummaryRow = {
  id: string;
  name: string;
  groupName: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  seeEveryDays: number | null;
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
    birthday,
    next: birthday ? upcoming(birthday, todayKey) : null,
    seeEveryDays: row.seeEveryDays,
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
