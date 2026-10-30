"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseAmount, parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { isGiftStatus, isValidBirthday, type GiftStatus } from "@/lib/people/birthdays";

export type PeopleFormState = { ok: true } | { ok: false; error: string } | null;

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/people", "layout");
  // Catch-ups show on Reminders' To do too.
  revalidatePath("/reminders", "layout");
}

/** Optional text: trimmed, cut to `max`, empty = null. */
function optional(formData: FormData, name: string, max: number): string | null {
  return String(formData.get(name) ?? "").trim().slice(0, max) || null;
}

type PersonFields = {
  name: string;
  groupName: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  seeEveryDays: number | null;
};

/** A picked "YYYY-MM-DD" that isn't in the future. */
async function readPastDate(raw: unknown): Promise<string | { error: string }> {
  const date = parseDateKey(raw);
  if (!date) return { error: "That date isn't valid." };
  if (date > (await getTodayKey())) return { error: "That date is in the future." };
  return date;
}

function readPerson(formData: FormData): PersonFields | string {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) return "Give them a name.";
  const rawEvery = String(formData.get("seeEveryDays") ?? "").trim();
  const seeEveryDays = rawEvery ? Number(rawEvery) : null;
  if (seeEveryDays !== null && (!Number.isInteger(seeEveryDays) || seeEveryDays < 1 || seeEveryDays > 3650)) {
    return "Catch up every … days should be a whole number from 1 to 3650.";
  }
  const base = { name, groupName: optional(formData, "groupName", 50), seeEveryDays };

  // The birthday is optional, but day and month go together; the year needs both.
  const rawDay = String(formData.get("birthDay") ?? "");
  const rawMonth = String(formData.get("birthMonth") ?? "");
  const rawYear = String(formData.get("birthYear") ?? "").trim();
  if (!rawDay && !rawMonth) {
    if (rawYear) return "Add the day and month too, or clear the year.";
    return { ...base, birthMonth: null, birthDay: null, birthYear: null };
  }
  if (!rawDay || !rawMonth) return "Pick both the day and the month (or neither).";
  const birthday = { birthMonth: Number(rawMonth), birthDay: Number(rawDay), birthYear: rawYear ? Number(rawYear) : null };
  if (!isValidBirthday(birthday)) {
    return birthday.birthYear !== null && birthday.birthMonth === 2 && birthday.birthDay === 29
      ? `${birthday.birthYear} had no 29 February.`
      : "That birthday isn't a real date.";
  }
  return { ...base, ...birthday };
}

export async function createPerson(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const fields = readPerson(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const person = await prisma.person.create({ data: fields, select: { id: true } });
  revalidate();
  redirect(`/people/${person.id}`);
}

export async function updatePerson(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const fields = readPerson(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const { count } = await prisma.person.updateMany({ where: { id }, data: fields });
  if (count === 0) return { ok: false, error: "That person no longer exists." };
  revalidate();
  redirect(`/people/${id}`);
}

/** Their facts, notes, gifts and seen days go with them (onDelete: Cascade). */
export async function deletePerson(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.person.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidate();
  redirect("/people");
}

type GiftFields = { title: string; price: number | null; link: string | null; occasion: string | null };

function readGift(formData: FormData): GiftFields | string {
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) return "What's the gift?";
  const rawPrice = String(formData.get("price") ?? "").trim();
  const price = rawPrice ? parseAmount(rawPrice) : null;
  if (rawPrice && price === null) return "That price isn't valid.";
  const link = optional(formData, "link", 2000);
  if (link && !/^https?:\/\/\S+$/i.test(link)) return "Links start with http:// or https://.";
  return { title, price, link, occasion: optional(formData, "occasion", 100) };
}

export async function addGift(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const personId = String(formData.get("personId") ?? "");
  const fields = readGift(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  if (!(await prisma.person.findUnique({ where: { id: personId }, select: { id: true } }))) {
    return { ok: false, error: "That person no longer exists." };
  }
  await prisma.gift.create({ data: { personId, ...fields } });
  revalidate();
  return { ok: true };
}

/** Title, price, occasion and link (+ the date, once given); the status moves with setGiftStatus. */
export async function updateGift(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const fields = readGift(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const id = String(formData.get("id") ?? "");
  // Only a given gift has a date (gift_valid); the form sends it only for those.
  let givenOn: Date | undefined;
  if (formData.has("givenOn")) {
    const date = await readPastDate(formData.get("givenOn"));
    if (typeof date !== "string") return { ok: false, error: date.error };
    givenOn = utc(date);
  }
  const { count } = givenOn
    ? await prisma.gift.updateMany({ where: { id, status: "given" }, data: { ...fields, givenOn } })
    : await prisma.gift.updateMany({ where: { id }, data: fields });
  if (count === 0) return { ok: false, error: "That gift no longer exists." };
  revalidate();
  return { ok: true };
}

/** Idea → bought → given; "given" dates it today, moving back clears the date. */
export async function setGiftStatus(id: string, status: GiftStatus): Promise<void> {
  await requireAuth();
  if (!isGiftStatus(status)) return;
  const givenOn = status === "given" ? utc(await getTodayKey()) : null;
  await prisma.gift.updateMany({ where: { id }, data: { status, givenOn } });
  revalidate();
}

export async function deleteGift(id: string): Promise<void> {
  await requireAuth();
  await prisma.gift.deleteMany({ where: { id } });
  revalidate();
}

/** Checks the person exists before adding something to them. */
async function personExists(personId: string): Promise<boolean> {
  return !!(await prisma.person.findUnique({ where: { id: personId }, select: { id: true } }));
}

// --- Things to remember ---

function readFact(formData: FormData): { label: string; value: string } | string {
  const label = String(formData.get("label") ?? "").trim().slice(0, 60);
  const value = String(formData.get("value") ?? "").trim().slice(0, 500);
  if (!label || !value) return "Fill in both what it is and the answer.";
  return { label, value };
}

export async function addFact(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const personId = String(formData.get("personId") ?? "");
  const fields = readFact(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  if (!(await personExists(personId))) return { ok: false, error: "That person no longer exists." };
  await prisma.personFact.create({ data: { personId, ...fields } });
  revalidate();
  return { ok: true };
}

export async function updateFact(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const fields = readFact(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const { count } = await prisma.personFact.updateMany({ where: { id: String(formData.get("id") ?? "") }, data: fields });
  if (count === 0) return { ok: false, error: "That line no longer exists." };
  revalidate();
  return { ok: true };
}

export async function deleteFact(id: string): Promise<void> {
  await requireAuth();
  await prisma.personFact.deleteMany({ where: { id } });
  revalidate();
}

// --- Notes ---

async function readNote(formData: FormData): Promise<{ date: Date; text: string } | string> {
  const text = String(formData.get("text") ?? "").trim().slice(0, 4000);
  if (!text) return "Write something first.";
  const date = await readPastDate(formData.get("date"));
  if (typeof date !== "string") return date.error;
  return { date: utc(date), text };
}

export async function addNote(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const personId = String(formData.get("personId") ?? "");
  const fields = await readNote(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  if (!(await personExists(personId))) return { ok: false, error: "That person no longer exists." };
  await prisma.personNote.create({ data: { personId, ...fields } });
  revalidate();
  return { ok: true };
}

export async function updateNote(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const fields = await readNote(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const { count } = await prisma.personNote.updateMany({ where: { id: String(formData.get("id") ?? "") }, data: fields });
  if (count === 0) return { ok: false, error: "That note no longer exists." };
  revalidate();
  return { ok: true };
}

export async function deleteNote(id: string): Promise<void> {
  await requireAuth();
  await prisma.personNote.deleteMany({ where: { id } });
  revalidate();
}

// --- Contact (seen / messaged) ---

const CONTACT_KINDS = ["seen", "message"] as const;
type ContactKind = (typeof CONTACT_KINDS)[number];

function isContactKind(value: unknown): value is ContactKind {
  return typeof value === "string" && (CONTACT_KINDS as readonly string[]).includes(value);
}

/** "Saw them today" / "Messaged them today"; tapping again takes it off. */
export async function toggleContactToday(personId: string, kind: ContactKind): Promise<void> {
  await requireAuth();
  if (!isContactKind(kind)) return;
  const seenOn = utc(await getTodayKey());
  const { count } = await prisma.personSeen.deleteMany({ where: { personId, seenOn, kind } });
  if (count === 0 && (await personExists(personId))) {
    // A double tap from two devices hits the unique index; that's still "today".
    await prisma.personSeen.createMany({ data: [{ personId, seenOn, kind }], skipDuplicates: true });
  }
  revalidate();
}

/** The sheep box on Reminders' To do: logs a message today (never takes one off). */
export async function logMessageToday(personId: string): Promise<{ ok: true; day: string } | { ok: false; error: string }> {
  await requireAuth();
  if (!(await personExists(personId))) return { ok: false, error: "That person no longer exists." };
  const day = await getTodayKey();
  await prisma.personSeen.createMany({ data: [{ personId, seenOn: utc(day), kind: "message" }], skipDuplicates: true });
  revalidate();
  return { ok: true, day };
}

/** "In touch on …": back-dates a visit or message you forgot to tap. */
export async function logContactOn(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  await requireAuth();
  const personId = String(formData.get("personId") ?? "");
  const kind = formData.get("kind");
  if (!isContactKind(kind)) return { ok: false, error: "Pick saw or messaged." };
  const date = await readPastDate(formData.get("seenOn"));
  if (typeof date !== "string") return { ok: false, error: date.error };
  if (!(await personExists(personId))) return { ok: false, error: "That person no longer exists." };
  await prisma.personSeen.createMany({ data: [{ personId, seenOn: utc(date), kind }], skipDuplicates: true });
  revalidate();
  return { ok: true };
}

export async function unlogContact(personId: string, day: string, kind: ContactKind): Promise<void> {
  await requireAuth();
  const date = parseDateKey(day);
  if (!date || !isContactKind(kind)) return;
  await prisma.personSeen.deleteMany({ where: { personId, seenOn: utc(date), kind } });
  revalidate();
}
