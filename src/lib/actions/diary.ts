"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { isMood, MAX_DIARY_LENGTH } from "@/lib/diary/onThisDay";

export type DiaryFormState = { ok: true } | { ok: false; error: string } | null;

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/diary", "layout");
}

/** Writes (or rewrites) the line for a day; the day can't be in the future. */
export async function saveDiaryEntry(_prev: DiaryFormState, formData: FormData): Promise<DiaryFormState> {
  await requireAuth();
  const date = parseDateKey(formData.get("date"));
  if (!date) return { ok: false, error: "That date isn't valid." };
  if (date > (await getTodayKey())) return { ok: false, error: "That day hasn't happened yet." };

  const text = String(formData.get("text") ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, error: "Write a line first." };
  if (text.length > MAX_DIARY_LENGTH) return { ok: false, error: `Keep it to ${MAX_DIARY_LENGTH} characters.` };

  const rawMood = String(formData.get("mood") ?? "");
  const mood = rawMood ? Number(rawMood) : null;
  if (mood !== null && !isMood(mood)) return { ok: false, error: "That mood isn't valid." };

  await prisma.diaryEntry.upsert({
    where: { date: utc(date) },
    create: { date: utc(date), text, mood },
    update: { text, mood },
  });
  revalidate();
  return { ok: true };
}

export async function deleteDiaryEntry(formData: FormData): Promise<void> {
  await requireAuth();
  const date = parseDateKey(formData.get("date"));
  if (date) await prisma.diaryEntry.deleteMany({ where: { date: utc(date) } });
  revalidate();
}
