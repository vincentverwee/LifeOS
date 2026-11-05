"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { cleanBit, diaryBits, isMood, MAX_BIT_LENGTH, MAX_DIARY_LENGTH } from "@/lib/diary/onThisDay";

export type DiaryFormState = { ok: true; at: number } | { ok: false; error: string } | null;

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/diary", "layout");
}

/** The form's date, if valid and not in the future. */
async function readDate(formData: FormData): Promise<{ date: string } | { error: string }> {
  const date = parseDateKey(formData.get("date"));
  if (!date) return { error: "That date isn't valid." };
  if (date > (await getTodayKey())) return { error: "That day hasn't happened yet." };
  return { date };
}

function readMood(formData: FormData): { mood: number | null } | { error: string } {
  const raw = String(formData.get("mood") ?? "");
  const mood = raw ? Number(raw) : null;
  if (mood !== null && !isMood(mood)) return { error: "That mood isn't valid." };
  return { mood };
}

const tooLong = `That day is full (${MAX_DIARY_LENGTH} characters). Edit it to make room.`;

/**
 * Adds one bit to the end of a day (a new line in its text), creating the day if needed.
 * A mood sent along is only used when the day is new (a mood on an existing day is set
 * straight away by `setDiaryMood`).
 */
export async function addDiaryBit(_prev: DiaryFormState, formData: FormData): Promise<DiaryFormState> {
  await requireAuth();
  const d = await readDate(formData);
  if ("error" in d) return { ok: false, error: d.error };
  const m = readMood(formData);
  if ("error" in m) return { ok: false, error: m.error };

  const bit = cleanBit(String(formData.get("text") ?? ""));
  if (!bit) return { ok: false, error: "Write something first." };
  if (bit.length > MAX_BIT_LENGTH) return { ok: false, error: `Keep one bit to ${MAX_BIT_LENGTH} characters.` };

  const date = utc(d.date);
  const full = await prisma.$transaction(async (tx) => {
    const existing = await tx.diaryEntry.findUnique({ where: { date }, select: { text: true } });
    if (!existing) {
      await tx.diaryEntry.create({ data: { date, text: bit, mood: m.mood } });
      return false;
    }
    const text = [...diaryBits(existing.text), bit].join("\n");
    if (text.length > MAX_DIARY_LENGTH) return true;
    await tx.diaryEntry.update({ where: { date }, data: { text } });
    return false;
  });
  if (full) return { ok: false, error: tooLong };

  revalidate();
  return { ok: true, at: Date.now() };
}

/** Rewrites a whole day: its bits one per line, and the mood. */
export async function saveDiaryEntry(_prev: DiaryFormState, formData: FormData): Promise<DiaryFormState> {
  await requireAuth();
  const d = await readDate(formData);
  if ("error" in d) return { ok: false, error: d.error };
  const m = readMood(formData);
  if ("error" in m) return { ok: false, error: m.error };

  const bits = diaryBits(String(formData.get("text") ?? ""));
  if (bits.length === 0) return { ok: false, error: "Write something first, or delete the day." };
  if (bits.some((b) => b.length > MAX_BIT_LENGTH)) {
    return { ok: false, error: `Keep each line to ${MAX_BIT_LENGTH} characters.` };
  }
  const text = bits.join("\n");
  if (text.length > MAX_DIARY_LENGTH) return { ok: false, error: `Keep the day to ${MAX_DIARY_LENGTH} characters.` };

  await prisma.diaryEntry.upsert({
    where: { date: utc(d.date) },
    create: { date: utc(d.date), text, mood: m.mood },
    update: { text, mood: m.mood },
  });
  revalidate();
  return { ok: true, at: Date.now() };
}

/** Sets (or clears) the mood of a day that already has something written; otherwise does nothing. */
export async function setDiaryMood(formData: FormData): Promise<void> {
  await requireAuth();
  const d = await readDate(formData);
  const m = readMood(formData);
  if ("error" in d || "error" in m) return;
  await prisma.diaryEntry.updateMany({ where: { date: utc(d.date) }, data: { mood: m.mood } });
  revalidate();
}

export async function deleteDiaryEntry(formData: FormData): Promise<void> {
  await requireAuth();
  const date = parseDateKey(formData.get("date"));
  if (date) await prisma.diaryEntry.deleteMany({ where: { date: utc(date) } });
  revalidate();
}
