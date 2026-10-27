"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dayKey, parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { FINISHED_DAYS, firstDueOn, isRepeat, nextDueAfter } from "@/lib/reminders/schedule";

export type ReminderFormState = { ok: true } | { ok: false; error: string } | null;
export type CompleteResult = { ok: true; previousDueOn: string | null } | { ok: false; error: string };

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/reminders", "layout");
}

type Fields = { title: string; repeat: string; dueOn: Date | null; anchorDay: number | null; weekdays: number[] };

function readForm(formData: FormData): Fields | string {
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) return "Give it a title.";
  const repeat = formData.get("repeat");
  if (!isRepeat(repeat)) return "Pick daily, weekly, monthly or none.";
  const rawDate = String(formData.get("dueOn") ?? "");
  const date = rawDate ? parseDateKey(rawDate) : null;
  if (rawDate && !date) return "That date isn't valid.";
  if (repeat !== "once" && !date) return "Repeating reminders need a start date.";
  const weekdays =
    repeat === "weekly"
      ? [...new Set(formData.getAll("weekday").map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      : [];
  if (repeat === "weekly" && weekdays.length === 0) return "Pick at least one day of the week.";
  return {
    title,
    repeat,
    dueOn: date ? utc(firstDueOn(repeat, date, weekdays)) : null,
    anchorDay: repeat === "monthly" && date ? Number(date.slice(8, 10)) : null,
    weekdays,
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
  const existing = await prisma.reminder.findFirst({ where: { id, doneAt: null }, select: { dueOn: true, anchorDay: true } });
  if (!existing) return { ok: false, error: "That reminder no longer exists." };
  // A monthly one on the 31st sits on the 30th in November; saving it unchanged must keep the 31st.
  if (fields.repeat === "monthly" && existing.anchorDay && fields.dueOn?.getTime() === existing.dueOn?.getTime()) {
    fields.anchorDay = existing.anchorDay;
  }
  await prisma.reminder.update({ where: { id }, data: fields });
  revalidate();
  redirect("/reminders");
}

/** The sheep box: a one-off is done for good, a repeating one moves to its next date after today. */
export async function completeReminder(id: string): Promise<CompleteResult> {
  await requireAuth();
  const reminder = await prisma.reminder.findFirst({ where: { id, doneAt: null } });
  if (!reminder) return { ok: false, error: "That reminder no longer exists." };
  const previousDueOn = reminder.dueOn ? dayKey(reminder.dueOn) : null;

  if (reminder.repeat === "once" || !isRepeat(reminder.repeat) || !previousDueOn) {
    await Promise.all([
      prisma.reminder.update({ where: { id }, data: { doneAt: new Date() } }),
      // Finished ones expire from the Timeline; clear those out while we're here.
      prisma.reminder.deleteMany({ where: { doneAt: { lt: new Date(Date.now() - FINISHED_DAYS * 86_400_000) } } }),
    ]);
  } else {
    const next = nextDueAfter({ ...reminder, repeat: reminder.repeat }, previousDueOn, await getTodayKey());
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

/** From the Finished tab: back on the open list. */
export async function restoreReminder(id: string): Promise<void> {
  await requireAuth();
  await prisma.reminder.updateMany({ where: { id }, data: { doneAt: null } });
  revalidate();
}

export async function deleteReminder(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.reminder.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidate();
  redirect("/reminders");
}
