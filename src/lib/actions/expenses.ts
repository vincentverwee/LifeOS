"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MAX_AMOUNT, formatDate, parseAmount, parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { monthFor } from "@/lib/data/ensureMonth";
import { knownError } from "@/lib/prismaErrors";
import { Prisma } from "@/generated/prisma/client";
import { parsePints, parsePubChoice, parseSizeMl, type PubChoice } from "@/lib/beer/types";
import { distanceM } from "@/lib/beer/nearby";

/** A typed pub this close to an OpenStreetMap pick of the same name is taken to be that place. */
const OSM_MATCH_M = 300;

/** An osmId (or other unique value) another save took a moment ago. */
function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function revalidateExpenseRoutes() {
  revalidatePath("/"); // hub shows "left today"
  revalidatePath("/budget/expenses");
  revalidatePath("/budget/add");
  revalidatePath("/budget");
  revalidatePath("/budget/insights");
  revalidatePath("/budget/settings"); // spent per month/trip
  revalidatePath("/beer", "layout"); // pints, pubs, map
}

/**
 * The Pub row id for a picked pub, created when it's new; null when a picked pub of yours
 * has since been merged or deleted (the beer then saves without one: the pub is optional,
 * and an offline entry must never get stuck on it). An OpenStreetMap place is matched by
 * osmId, else by name to one you typed that has no position yet or is right there. A
 * typed name matches yours case-insensitively. Only missing positions are filled in:
 * a spot you set and your renames are never overwritten.
 */
async function resolvePub(choice: PubChoice): Promise<string | null> {
  if (choice.kind === "known") {
    const pub = await prisma.pub.findUnique({ where: { id: choice.id }, select: { id: true, latitude: true, osmId: true } });
    if (!pub) return null;
    // Found on the map for one of yours without a spot: place it (its name stays yours).
    if (choice.place && pub.latitude === null) {
      const position = { latitude: choice.place.latitude, longitude: choice.place.longitude };
      const taken = await prisma.pub.findUnique({ where: { osmId: choice.place.osmId }, select: { id: true } });
      try {
        await prisma.pub.update({
          where: { id: pub.id },
          data: { ...position, ...(pub.osmId === null && !taken && { osmId: choice.place.osmId }) },
        });
      } catch (e) {
        // Another save linked that place meanwhile: just take the position.
        if (!isUniqueViolation(e)) throw e;
        await prisma.pub.update({ where: { id: pub.id }, data: position });
      }
    }
    return pub.id;
  }

  const position =
    choice.latitude !== undefined && choice.longitude !== undefined
      ? { latitude: choice.latitude, longitude: choice.longitude }
      : null;

  if (choice.kind === "osm") {
    const linked = await prisma.pub.findUnique({ where: { osmId: choice.osmId }, select: { id: true } });
    if (linked) return linked.id;
    const sameName = await prisma.pub.findMany({
      where: { osmId: null, name: { equals: choice.name, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, latitude: true, longitude: true },
    });
    const typed = sameName.find(
      (p) =>
        p.latitude === null ||
        p.longitude === null ||
        distanceM(p.latitude, p.longitude, choice.latitude, choice.longitude) <= OSM_MATCH_M
    );
    try {
      if (typed) {
        await prisma.pub.update({
          where: { id: typed.id },
          data: { osmId: choice.osmId, ...(typed.latitude === null && position) },
        });
        return typed.id;
      }
      const pub = await prisma.pub.create({ data: { name: choice.name, osmId: choice.osmId, ...position }, select: { id: true } });
      return pub.id;
    } catch (e) {
      // Another save linked or created that place at the same moment: use that one.
      if (isUniqueViolation(e)) {
        const pub = await prisma.pub.findUnique({ where: { osmId: choice.osmId }, select: { id: true } });
        if (pub) return pub.id;
      }
      throw e;
    }
  }

  const existing = await prisma.pub.findFirst({
    where: { name: { equals: choice.name, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, latitude: true },
  });
  if (existing) {
    if (existing.latitude === null && position) await prisma.pub.update({ where: { id: existing.id }, data: position });
    return existing.id;
  }
  const pub = await prisma.pub.create({ data: { name: choice.name, ...position }, select: { id: true } });
  return pub.id;
}

type BeerFields = { pubId: string | null; pints: number | null; sizeMl: number | null };

/**
 * Pub and pints for an expense in `category`: only a beer category (one with a
 * pint price) keeps them; anything else gets neither.
 */
async function beerFields(
  category: { pintPrice: unknown },
  pub: PubChoice | null | undefined,
  pints: number | null | undefined,
  sizeMl: number | null | undefined
): Promise<BeerFields> {
  if (category.pintPrice === null) return { pubId: null, pints: null, sizeMl: null };
  return { pubId: pub ? await resolvePub(pub) : null, pints: parsePints(pints), sizeMl: parseSizeMl(sizeMl) };
}

// Date-only values are stored as UTC midnight (@db.Date), so "2026-10-24"
// must be parsed as UTC to avoid drifting a day in other timezones.
function utcDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

/** Zero is allowed here only so a free beer can pass; see checkFree. */
function checkAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount < 0) return "Enter an amount greater than zero.";
  if (amount > MAX_AMOUNT) return "That amount is too large.";
  return null;
}

/** A free (0 €) expense is only a beer with a pint count; anything else needs an amount. */
function checkFree(amount: number, isBeer: boolean, pints: number | null): string | null {
  if (amount > 0) return null;
  if (!isBeer) return "Enter an amount greater than zero.";
  if (!pints) return "A free beer needs a pint count.";
  return null;
}

const toCents = (amount: number) => Math.round(amount * 100) / 100;

export type ExpensePeriod = { type: "cycle" | "trip"; id: string };

type Target =
  | { ok: true; period: ExpensePeriod; name: string }
  | { ok: false; error: string };

/**
 * Where an expense on `date` belongs. A trip keeps it only inside its dates.
 * For months the date decides: "yesterday" on the 1st goes to last month.
 */
async function resolveTarget(period: ExpensePeriod, date: Date, todayKey: string): Promise<Target> {
  if (period.type === "trip") {
    const trip = await prisma.trip.findUnique({
      where: { id: period.id },
      select: { name: true, startDate: true, endDate: true },
    });
    if (!trip) return { ok: false, error: "That trip no longer exists." };
    if (date < trip.startDate || date > trip.endDate) {
      return {
        ok: false,
        error: `${trip.name} runs ${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}; pick a date in that range.`,
      };
    }
    return { ok: true, period, name: trip.name };
  }

  const cycle = await prisma.budgetCycle.findUnique({
    where: { id: period.id },
    select: { name: true, startDate: true, endDate: true },
  });
  if (!cycle) return { ok: false, error: "That month no longer exists." };
  if (date >= cycle.startDate && date <= cycle.endDate) return { ok: true, period, name: cycle.name };

  // Dates in a month that doesn't exist yet (next month, or one the app was never opened in).
  const covering = await monthFor(date.toISOString().slice(0, 10), todayKey);
  if (!covering) return { ok: false, error: `No month covers ${formatDate(date)}.` };
  return { ok: true, period: { type: "cycle", id: covering.id }, name: covering.name };
}

export type CreateExpenseInput = {
  period: ExpensePeriod;
  categoryId: string;
  amount: number;
  date?: string;
  note?: string | null;
  /**
   * A UUID made on the phone, used as the expense's id so a retried save (offline
   * queue, or a reply lost on a bad connection) can never create it twice.
   */
  clientId?: string;
  /** beer only: where it was bought */
  pub?: PubChoice | null;
  /** beer only: how many pints (null = guessed from the category's pint price) */
  pints?: number | null;
  /** beer only: ml per beer (null = a pint) */
  sizeMl?: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateExpenseResult =
  | {
      ok: true;
      expenseId: string;
      /** set when the date put the expense in another month than the one picked */
      movedTo: string | null;
    }
  | { ok: false; error: string };

export async function createExpense(input: CreateExpenseInput): Promise<CreateExpenseResult> {
  await requireAuth();
  const amountError = checkAmount(input.amount);
  if (amountError) return { ok: false, error: amountError };
  const clientId = input.clientId && UUID.test(input.clientId) ? input.clientId.toLowerCase() : undefined;

  // Already saved by an earlier attempt: report success again instead of a duplicate.
  if (clientId && (await prisma.expense.findUnique({ where: { id: clientId }, select: { id: true } }))) {
    return { ok: true, expenseId: clientId, movedTo: null };
  }

  // No date (the form sends "" before hydration) means today; a bad one is an error.
  const todayKey = await getTodayKey();
  const dateKey = input.date ? parseDateKey(input.date) : todayKey;
  if (!dateKey) return { ok: false, error: "Pick a valid date." };
  const date = utcDate(dateKey);

  const [category, target] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true, pintPrice: true } }),
    resolveTarget(input.period, date, todayKey),
  ]);
  if (!category) return { ok: false, error: "That category no longer exists." };
  if (!target.ok) return target;
  const beer = await beerFields(category, input.pub, input.pints, input.sizeMl);
  const freeError = checkFree(input.amount, category.pintPrice !== null, beer.pints);
  if (freeError) return { ok: false, error: freeError };

  let expense: { id: string };
  try {
    expense = await prisma.expense.create({
      data: {
        ...(clientId && { id: clientId }),
        categoryId: category.id,
        tripId: target.period.type === "trip" ? target.period.id : null,
        cycleId: target.period.type === "cycle" ? target.period.id : null,
        amount: toCents(input.amount),
        date,
        note: input.note?.trim().slice(0, 500) || null,
        pubId: beer.pubId,
        pints: beer.pints,
        sizeMl: beer.sizeMl,
      },
      select: { id: true },
    });
  } catch (e) {
    // Two attempts with the same clientId raced; the other one saved it.
    if (clientId && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: true, expenseId: clientId, movedTo: null };
    }
    throw e;
  }

  revalidateExpenseRoutes();
  return {
    ok: true,
    expenseId: expense.id,
    movedTo: target.period.id !== input.period.id ? target.name : null,
  };
}

export type CreateExpenseFormState = CreateExpenseResult | null;

export async function createExpenseFromForm(
  _prevState: CreateExpenseFormState,
  formData: FormData
): Promise<CreateExpenseFormState> {
  await requireAuth();
  const categoryId = String(formData.get("categoryId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const note = formData.get("note");
  const date = formData.get("date");
  const periodType = formData.get("periodType");
  const periodId = String(formData.get("periodId") ?? "");

  if (!categoryId) return { ok: false, error: "Pick a category first." };
  if ((periodType !== "cycle" && periodType !== "trip") || !periodId) {
    return { ok: false, error: "Pick a month or trip first." };
  }

  const amount = parseAmount(amountRaw);
  if (amount === null) {
    return { ok: false, error: "Enter a valid amount, e.g. 6,80 or 6,8+7,4." };
  }

  // The pub picker sends its choice as JSON (src/components/beer/PubPicker.tsx).
  let pub: PubChoice | null = null;
  const pubRaw = String(formData.get("pub") ?? "");
  if (pubRaw) {
    try {
      pub = parsePubChoice(JSON.parse(pubRaw));
    } catch {
      pub = null;
    }
  }

  return createExpense({
    period: { type: periodType, id: periodId },
    categoryId,
    amount,
    date: typeof date === "string" ? date : undefined,
    note: typeof note === "string" ? note : null,
    clientId: String(formData.get("clientId") ?? "") || undefined,
    pub,
    pints: parsePints(formData.get("pints")),
    sizeMl: parseSizeMl(formData.get("sizeMl")),
  });
}

export type UpdateExpenseInput = {
  id: string;
  categoryId: string;
  amount: number;
  date: string;
  note?: string | null;
  /** beer only; null clears it, undefined leaves the stored pub (and, if also undefined, the pints) */
  pub?: PubChoice | null;
  pints?: number | null;
  /** beer only; undefined leaves the stored size, null = a pint */
  sizeMl?: number | null;
};

export type ExpenseMutationResult = { ok: true } | { ok: false; error: string };

export type UpdateExpenseResult =
  | {
      ok: true;
      /** set when the new date moved the expense to another month */
      movedTo: string | null;
    }
  | { ok: false; error: string };

export async function updateExpense(input: UpdateExpenseInput): Promise<UpdateExpenseResult> {
  await requireAuth();
  const amountError = checkAmount(input.amount);
  if (amountError) return { ok: false, error: amountError };
  // Editing never falls back to today: a cleared date field is a mistake, not "today".
  const dateKey = parseDateKey(input.date);
  if (!dateKey) return { ok: false, error: "Pick a valid date." };

  const [existing, category] = await Promise.all([
    prisma.expense.findUnique({
      where: { id: input.id },
      select: { cycleId: true, tripId: true, pubId: true, pints: true, sizeMl: true },
    }),
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true, pintPrice: true } }),
  ]);
  if (!existing) return { ok: false, error: "That expense no longer exists." };
  if (!category) return { ok: false, error: "That category no longer exists." };
  // Left out = unchanged; moving it out of beer drops the pub and pints.
  const sizeMl = input.sizeMl === undefined ? existing.sizeMl : input.sizeMl;
  const beer: BeerFields =
    input.pub === undefined && category.pintPrice !== null
      ? {
          pubId: existing.pubId,
          pints: input.pints === undefined ? existing.pints : parsePints(input.pints),
          sizeMl: parseSizeMl(sizeMl),
        }
      : await beerFields(category, input.pub, input.pints === undefined ? existing.pints : input.pints, sizeMl);
  const freeError = checkFree(input.amount, category.pintPrice !== null, beer.pints);
  if (freeError) return { ok: false, error: freeError };

  // A new date can move the expense to another month (trips must contain it).
  const date = utcDate(dateKey);
  const current: ExpensePeriod | null = existing.tripId
    ? { type: "trip", id: existing.tripId }
    : existing.cycleId
      ? { type: "cycle", id: existing.cycleId }
      : null;
  const target = current ? await resolveTarget(current, date, await getTodayKey()) : null;
  if (target && !target.ok) return target;

  try {
    await prisma.expense.update({
      where: { id: input.id },
      data: {
        categoryId: category.id,
        amount: toCents(input.amount),
        date,
        note: input.note?.trim().slice(0, 500) || null,
        pubId: beer.pubId,
        pints: beer.pints,
        sizeMl: beer.sizeMl,
        ...(target?.ok && target.period.type === "cycle" ? { cycleId: target.period.id } : {}),
      },
    });
  } catch (e) {
    return knownError(e, { P2025: "That expense no longer exists.", P2003: "That category no longer exists." });
  }

  revalidateExpenseRoutes();
  return { ok: true, movedTo: target?.ok && target.period.id !== current?.id ? target.name : null };
}

export async function deleteExpense(id: string): Promise<ExpenseMutationResult> {
  await requireAuth();
  const { count } = await prisma.expense.deleteMany({ where: { id } });
  if (count === 0) return { ok: false, error: "That expense no longer exists." };
  revalidateExpenseRoutes();
  return { ok: true };
}
