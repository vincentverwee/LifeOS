"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dayKey, parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { isRepeat, nextDueAfter } from "@/lib/reminders/schedule";

export type ReminderFormState = { ok: true } | { ok: false; error: string } | null;
export type CompleteResult = { ok: true; previousDueOn: string | null } | { ok: false; error: string };

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/reminders");
}

type Fields = { title: string; repeat: string; dueOn: Date | null; anchorDay: number | null };

function readForm(formData: FormData): Fields | string {
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) return "Give it a title.";
  const repeat = formData.get("repeat");
  if (!isRepeat(repeat)) return "Pick once, weekly or monthly.";
  const rawDate = String(formData.get("dueOn") ?? "");
  const date = rawDate ? parseDateKey(rawDate) : null;
  if (rawDate && !date) return "That date isn't valid.";
  if (repeat !== "once" && !date) return "Repeating reminders need a start date.";
  return {
    title,
    repeat,
    dueOn: date ? utc(date) : null,
    anchorDay: repeat === "monthly" && date ? Number(date.slice(8, 10)) : null,
  };
}

export async function createReminder(_prev: ReminderFormState, formData: FormData): Promise<ReminderFormState> {
  await requireAuth();
  const fields = readForm(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  await prisma.reminder.create({ data: fields });
  revalidate();
  return { ok: true };
}

export async function updateReminder(_prev: ReminderFormState, formData: FormData): Promise<ReminderFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const fields = readForm(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const { count } = await prisma.reminder.updateMany({ where: { id, doneAt: null }, data: fields });
  if (count === 0) return { ok: false, error: "That reminder no longer exists." };
  revalidate();
  redirect("/reminders");
}

/** The sheep box: a one-off is done for good, a weekly/monthly one moves to its next date after today. */
export async function completeReminder(id: string): Promise<CompleteResult> {
  await requireAuth();
  const reminder = await prisma.reminder.findFirst({ where: { id, doneAt: null } });
  if (!reminder) return { ok: false, error: "That reminder no longer exists." };
  const previousDueOn = reminder.dueOn ? dayKey(reminder.dueOn) : null;

  if (reminder.repeat === "once" || !isRepeat(reminder.repeat) || !previousDueOn) {
    await prisma.reminder.update({ where: { id }, data: { doneAt: new Date() } });
  } else {
    const next = nextDueAfter(reminder.repeat, previousDueOn, reminder.anchorDay, await getTodayKey());
    await prisma.reminder.update({ where: { id }, data: { dueOn: utc(next) } });
  }
  revalidate();
  return { ok: true, previousDueOn };
}

/** Undo for the sheep box: back to open with the date it had. */
export async function undoCompleteReminder(id: string, previousDueOn: string | null): Promise<void> {
  await requireAuth();
  const date = previousDueOn === null ? null : parseDateKey(previousDueOn);
  if (previousDueOn !== null && !date) return;
  await prisma.reminder.updateMany({ where: { id }, data: { doneAt: null, dueOn: date ? utc(date) : null } });
  revalidate();
}

export async function deleteReminder(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.reminder.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidate();
  redirect("/reminders");
}
