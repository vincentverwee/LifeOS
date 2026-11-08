"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayKey } from "@/lib/today";
import { parseWeek, WIN_MAX } from "@/lib/review/week";

export type WinState = { ok: true; win: string | null } | { ok: false; error: string } | null;

/** Saves (or, when empty, clears) the weekly review's win of the week. */
export async function saveWeekWin(_prev: WinState, formData: FormData): Promise<WinState> {
  await requireAuth();
  const week = parseWeek(formData.get("week"), await getTodayKey());
  if (!week) return { ok: false, error: "That week isn't valid." };

  const win = String(formData.get("win") ?? "").replace(/\s+/g, " ").trim();
  if (win.length > WIN_MAX) return { ok: false, error: `Keep it to ${WIN_MAX} characters.` };

  const weekStart = new Date(`${week}T00:00:00Z`);
  if (win) {
    await prisma.weekReview.upsert({ where: { weekStart }, create: { weekStart, win }, update: { win } });
  } else {
    await prisma.weekReview.deleteMany({ where: { weekStart } });
  }
  revalidatePath("/review");
  return { ok: true, win: win || null };
}
