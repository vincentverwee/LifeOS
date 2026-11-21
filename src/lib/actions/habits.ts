"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTodayKey } from "@/lib/today";
import { isHabitKey } from "@/lib/reminders/habits";

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

/** Turn daily habits on (from today) or off (their history stays). */
export async function setHabitsOn(on: boolean) {
  await requireAuth();
  if (on) {
    const since = utc(await getTodayKey());
    await prisma.habitSettings.upsert({ where: { id: "current" }, create: { since }, update: {} });
  } else {
    await prisma.habitSettings.deleteMany({});
  }
  revalidatePath("/reminders", "layout");
}

/** Tick or untick a habit for today. */
export async function toggleHabitToday(habit: string, done: boolean) {
  await requireAuth();
  if (!isHabitKey(habit)) return;
  const doneOn = utc(await getTodayKey());
  if (done) {
    await prisma.habitLog.upsert({ where: { habit_doneOn: { habit, doneOn } }, create: { habit, doneOn }, update: {} });
  } else {
    await prisma.habitLog.deleteMany({ where: { habit, doneOn } });
  }
  revalidatePath("/reminders", "layout");
}
