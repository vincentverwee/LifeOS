"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { knownError } from "@/lib/prismaErrors";
import { parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";

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

/** A date the user picked; it can't be in the future. */
async function readPastDate(raw: unknown): Promise<{ date: string } | { error: string }> {
  const date = parseDateKey(raw);
  if (!date) return { error: "That date isn't valid." };
  if (date > (await getTodayKey())) return { error: "That date is in the future." };
  return { date };
}

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
    if ("error" in picked) return { ok: false, error: picked.error };
    firstLog = picked.date;
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
  try {
    const { count } = await prisma.routine.updateMany({ where: { id }, data: fields });
    if (count === 0) return { ok: false, error: "That item no longer exists." };
  } catch (e) {
    return knownError(e, NAME_TAKEN);
  }
  revalidate();
  redirect("/reminders/last-done");
}

export async function deleteRoutine(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.routine.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidate();
  redirect("/reminders/last-done");
}

/** The sheep: done today (a second tap the same day changes nothing). */
export async function logRoutineToday(id: string): Promise<void> {
  await requireAuth();
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
  await prisma.routineLog.deleteMany({ where: { routineId: id, doneOn: utc(await getTodayKey()) } });
  revalidate();
}

/** Edit page: "I did it on …". */
export async function logRoutineOn(_prev: RoutineFormState, formData: FormData): Promise<RoutineFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const picked = await readPastDate(formData.get("doneOn"));
  if ("error" in picked) return { ok: false, error: picked.error };
  const doneOn = utc(picked.date);
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
  await prisma.routineLog.deleteMany({ where: { id: String(formData.get("logId") ?? "") } });
  revalidate();
}
