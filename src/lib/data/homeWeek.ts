import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { addDays, mondayOf } from "@/lib/lessons/stats";
import { totals } from "@/lib/beer/stats";
import { getRecentBeerVisits } from "@/lib/data/beer";

/*
 * "This week" (Mon → Sun) per section, for the small strip at the bottom of Home tiles
 * that had none (Beer, Diary), reading the same way as Lessons and Workouts. One query each;
 * days after today stay empty.
 */

export type WeekDay = { key: string; label: string; future: boolean };

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function weekOf(todayKey: string): WeekDay[] {
  const monday = mondayOf(todayKey);
  return LETTERS.map((label, i) => {
    const key = addDays(monday, i);
    return { key, label, future: key > todayKey };
  });
}

const range = (todayKey: string) => {
  const monday = mondayOf(todayKey);
  return { gte: new Date(`${monday}T00:00:00Z`), lte: new Date(`${todayKey}T00:00:00Z`) };
};

/** Pints per day this week. */
export const getBeerWeek = cache(async (todayKey: string): Promise<number[]> => {
  const visits = await getRecentBeerVisits(todayKey);
  return weekOf(todayKey).map((d) => totals(visits.filter((v) => v.date === d.key)).pints);
});

/** Each day this week: its mood (1–5), 0 = written without a mood, null = nothing written. */
export const getDiaryWeek = cache(async (todayKey: string): Promise<(number | null)[]> => {
  const rows = await prisma.diaryEntry.findMany({ where: { date: range(todayKey) }, select: { date: true, mood: true } });
  const byDay = new Map(rows.map((r) => [dayKey(r.date), r.mood ?? 0]));
  return weekOf(todayKey).map((d) => byDay.get(d.key) ?? null);
});

