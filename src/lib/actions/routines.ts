"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { knownError } from "@/lib/prismaErrors";
import { getTodayKey, readPastDate } from "@/lib/today";
import { categoryIdOf, categorySource } from "@/lib/reminders/routines";
import { backfillCategoryRoutine } from "@/lib/data/categoryRoutines";

export type RoutineFormState = { ok: true } | { ok: false; error: string } | null;

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/reminders", "layout");
}

function readFields(formData: FormData): { name: string; everyDays: number | null } | string {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) return "Give it a name.";
  const rawEvery = String(formData.get("everyDays") ?? "").trim();
  const everyDays = rawEvery ? Number(rawEvery) : null;
  if (everyDays !== null && (!Number.isInteger(everyDays) || everyDays < 1 || everyDays > 365)) {
    return "Every … days should be a whole number from 1 to 365.";
  }
  return { name, everyDays };
}

const NAME_TAKEN = { P2002: "You already have one with that name." };

export async function createRoutine(_prev: RoutineFormState, formData: FormData): Promise<RoutineFormState> {
  await requireAuth();
  const fields = readFields(formData);
  if (typeof fields === "string") return { ok: false, error: fields };

  // "today" / "not-yet" / "date" (+ lastDoneOn)
  const last = String(formData.get("last") ?? "today");
  let firstLog: string | null = null;
  if (last === "today") firstLog = await getTodayKey();
  else if (last === "date") {
    const picked = await readPastDate(formData.get("lastDoneOn"));
    if (typeof picked !== "string") return { ok: false, error: picked.error };
    firstLog = picked;
  }

  try {
    await prisma.routine.create({
      data: { ...fields, logs: firstLog ? { create: { doneOn: utc(firstLog) } } : undefined },
    });
  } catch (e) {
    return knownError(e, NAME_TAKEN);
  }
  revalidate();
  redirect("/reminders/last-done");
}

export async function updateRoutine(_prev: RoutineFormState, formData: FormData): Promise<RoutineFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (typeof fields === "string") return { ok: false, error: fields };

  const current = await prisma.routine.findUnique({ where: { id }, select: { source: true } });
  if (!current) return { ok: false, error: "That item no longer exists." };
  // "Done when I spend on …": only for hand-ticked items or ones already linked to a category
  // (never touches the wash items' source). Empty = no link.
  let source = current.source;
  let linkedTo: string | null = null;
  if (formData.has("categoryId") && (current.source === null || categoryIdOf(current.source))) {
    const categoryId = String(formData.get("categoryId") ?? "");
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
      if (!category) return { ok: false, error: "That category no longer exists." };
      source = categorySource(category.id);
      const taken = await prisma.routine.findFirst({ where: { source, id: { not: id } }, select: { name: true } });
      if (taken) return { ok: false, error: `“${taken.name}” is already linked to that category.` };
      if (categoryIdOf(current.source) !== category.id) linkedTo = category.id;
    } else {
      source = null;
    }
  }

  try {
    const { count } = await prisma.routine.updateMany({ where: { id }, data: { ...fields, source } });
    if (count === 0) return { ok: false, error: "That item no longer exists." };
  } catch (e) {
    return knownError(e, NAME_TAKEN);
  }
  // Fill in the past: every day with an expense in that category (unlinking keeps the logs).
  if (linkedTo) await backfillCategoryRoutine(id, linkedTo);
  revalidate();
  redirect("/reminders/last-done");
}

export async function deleteRoutine(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.routine.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidate();
  redirect("/reminders/last-done");
}

/** Items another feature logs (`Routine.source`, e.g. the wash) can't be ticked here. */
async function isByHand(id: string): Promise<boolean> {
  const routine = await prisma.routine.findUnique({ where: { id: String(id) }, select: { source: true } });
  return routine !== null && routine.source === null;
}

/** The sheep: done today (a second tap the same day changes nothing). */
export async function logRoutineToday(id: string): Promise<void> {
  await requireAuth();
  if (!(await isByHand(id))) return;
  const doneOn = utc(await getTodayKey());
  await prisma.routineLog.upsert({
    where: { routineId_doneOn: { routineId: id, doneOn } },
    create: { routineId: id, doneOn },
    update: {},
  });
  revalidate();
}

/** Untick / Undo: removes today's log. */
export async function unlogRoutineToday(id: string): Promise<void> {
  await requireAuth();
  if (!(await isByHand(id))) return;
  await prisma.routineLog.deleteMany({ where: { routineId: id, doneOn: utc(await getTodayKey()) } });
  revalidate();
}

/** Edit page: "I did it on …". */
export async function logRoutineOn(_prev: RoutineFormState, formData: FormData): Promise<RoutineFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!(await isByHand(id))) return { ok: false, error: "This one is logged from elsewhere." };
  const picked = await readPastDate(formData.get("doneOn"));
  if (typeof picked !== "string") return { ok: false, error: picked.error };
  const doneOn = utc(picked);
  await prisma.routineLog.upsert({
    where: { routineId_doneOn: { routineId: id, doneOn } },
    create: { routineId: id, doneOn },
    update: {},
  });
  revalidate();
  return { ok: true };
}

export async function deleteRoutineLog(formData: FormData): Promise<void> {
  await requireAuth();
  // Logs mirrored from expenses or washes can't be removed by hand.
  await prisma.routineLog.deleteMany({ where: { id: String(formData.get("logId") ?? ""), routine: { source: null } } });
  revalidate();
}
