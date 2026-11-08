import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { STUDY_ENTRY_WHERE } from "@/lib/data/lessons";
import { dayKey } from "@/lib/format";
import { pintsOf } from "@/lib/monthStats";
import { addDays } from "@/lib/reminders/schedule";
import { dayOfTrip, diaryBits, sameDayInPastYears } from "@/lib/diary/onThisDay";

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

export type DiaryRow = { id: string; date: string; text: string; mood: number | null };

const ROW_SELECT = { id: true, date: true, text: true, mood: true } as const;

function toRow(r: { id: string; date: Date; text: string; mood: number | null }): DiaryRow {
  return { id: r.id, date: dayKey(r.date), text: r.text, mood: r.mood };
}

export async function getDiaryEntry(dateKey: string): Promise<DiaryRow | null> {
  const row = await prisma.diaryEntry.findUnique({ where: { date: utc(dateKey) }, select: ROW_SELECT });
  return row ? toRow(row) : null;
}

/** The newest `limit` lines before `before` (exclusive), plus whether older ones exist. */
export async function getRecentDiary(limit: number, before?: string): Promise<{ rows: DiaryRow[]; more: boolean }> {
  const rows = await prisma.diaryEntry.findMany({
    where: before ? { date: { lt: utc(before) } } : undefined,
    orderBy: { date: "desc" },
    take: limit + 1,
    select: ROW_SELECT,
  });
  return { rows: rows.slice(0, limit).map(toRow), more: rows.length > limit };
}

/** The mood of each of the last `days` days up to today (null = none logged), oldest first. */
export async function getMoodStrip(todayKey: string, days: number): Promise<{ date: string; mood: number | null }[]> {
  const from = addDays(todayKey, -(days - 1));
  const rows = await prisma.diaryEntry.findMany({
    where: { date: { gte: utc(from), lte: utc(todayKey) } },
    select: { date: true, mood: true },
  });
  const byDay = new Map(rows.map((r) => [dayKey(r.date), r.mood]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { date, mood: byDay.get(date) ?? null };
  });
}

export type MemoryBeer = { pints: number; pubs: { id: string; name: string }[] };
export type MemoryTrip = { id: string; title: string; day: number; withVan: boolean; stop: string | null };
export type MemoryStudy = { hours: number; courses: string[]; dayOff: boolean; periodId: string };
export type MemoryLink = { id: string; name: string; href: string };

export type Memory = {
  yearsAgo: number;
  /** The day shown (the first key of that year). */
  date: string;
  entry: DiaryRow | null;
  beer: MemoryBeer | null;
  trips: MemoryTrip[];
  study: MemoryStudy | null;
  outfits: MemoryLink[];
  recipes: MemoryLink[];
};

/**
 * Everything logged on `dateKey`'s day in earlier years, newest year first; years with
 * nothing are left out. One query per source on `date IN (…)`, so the date indexes do the
 * work. Recipes only remember the last time they were made, so older makes don't show.
 * Waypoint never reads route geometry here (Supabase egress).
 */
export async function getOnThisDay(dateKey: string): Promise<Memory[]> {
  const years = sameDayInPastYears(dateKey);
  const keys = years.flatMap((y) => y.keys);
  const dates = keys.map(utc);
  const first = keys[keys.length - 1];
  const last = keys[0];

  const [entries, beers, study, wears, myRecipes, savedRecipes, trips] = await Promise.all([
    prisma.diaryEntry.findMany({ where: { date: { in: dates } }, select: ROW_SELECT }),
    prisma.expense.findMany({
      where: { date: { in: dates }, category: { pintPrice: { not: null } } },
      select: {
        date: true,
        amount: true,
        pints: true,
        pub: { select: { id: true, name: true } },
        category: { select: { pintPrice: true } },
      },
    }),
    prisma.studyEntry.findMany({
      // Tracked time (courses with countsAsStudy off) isn't study, so it stays out of memories.
      where: { date: { in: dates }, ...STUDY_ENTRY_WHERE },
      select: { date: true, hours: true, note: true, periodId: true, course: { select: { name: true } } },
    }),
    prisma.outfitWear.findMany({
      where: { wornOn: { in: dates } },
      select: { wornOn: true, outfit: { select: { id: true, name: true } } },
    }),
    prisma.myRecipe.findMany({ where: { lastMadeOn: { in: dates } }, select: { id: true, title: true, lastMadeOn: true } }),
    prisma.savedRecipe.findMany({ where: { madeOn: { in: dates } }, select: { id: true, title: true, madeOn: true } }),
    // Trips overlapping the whole span, narrowed to the exact days below. Titles and dates only.
    prisma.waypointTrip.findMany({
      where: { startDate: { not: null, lte: utc(last) }, endDate: { not: null, gte: utc(first) } },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        withVan: true,
        locations: {
          orderBy: { visitOrder: "asc" },
          select: { name: true, city: true, arrivalDate: true, departureDate: true },
        },
      },
    }),
  ]);

  return years.flatMap((year): Memory[] => {
    const inYear = (d: Date | null) => d !== null && year.keys.includes(dayKey(d));

    const entry = entries.find((e) => inYear(e.date));

    const yearBeers = beers.filter((b) => inYear(b.date));
    const pints = yearBeers.reduce(
      (sum, b) => sum + pintsOf({ amount: b.amount.toNumber(), pints: b.pints, pintPrice: b.category.pintPrice?.toNumber() ?? 0 }),
      0
    );
    const pubs = [...new Map(yearBeers.flatMap((b) => (b.pub ? [[b.pub.id, b.pub] as const] : []))).values()];
    const beer = yearBeers.length > 0 && (pints > 0 || pubs.length > 0) ? { pints, pubs } : null;

    const yearStudy = study.filter((s) => inYear(s.date));
    const hours = yearStudy.reduce((sum, s) => sum + s.hours.toNumber(), 0);
    const courses = [...new Set(yearStudy.flatMap((s) => (s.course && s.hours.toNumber() > 0 ? [s.course.name] : [])))];
    const studyMemory =
      yearStudy.length > 0
        ? { hours, courses, dayOff: hours === 0 && yearStudy.some((s) => s.note), periodId: yearStudy[0].periodId }
        : null;
    const studyShown = studyMemory && (studyMemory.hours > 0 || studyMemory.dayOff) ? studyMemory : null;

    const outfits = [...new Map(wears.filter((w) => inYear(w.wornOn)).map((w) => [w.outfit.id, w.outfit])).values()].map(
      (o) => ({ id: o.id, name: o.name, href: `/wardrobe/outfits/${o.id}` })
    );
    const recipes = [
      ...myRecipes.filter((r) => inYear(r.lastMadeOn)).map((r) => ({ id: r.id, name: r.title, href: `/recipes/mine/${r.id}` })),
      ...savedRecipes.filter((r) => inYear(r.madeOn)).map((r) => ({ id: r.id, name: r.title, href: `/recipes/${r.id}` })),
    ];

    const yearTrips = trips.flatMap((t): MemoryTrip[] => {
      const start = dayKey(t.startDate!);
      const end = dayKey(t.endDate!);
      const day = year.keys.find((k) => k >= start && k <= end);
      if (!day) return [];
      // The stop you were at: arrived on or before that day and not yet left.
      const stop = t.locations.findLast(
        (l) => l.arrivalDate && dayKey(l.arrivalDate) <= day && (!l.departureDate || dayKey(l.departureDate) >= day)
      );
      return [{ id: t.id, title: t.title, day: dayOfTrip(start, day), withVan: t.withVan, stop: stop ? (stop.city ?? stop.name) : null }];
    });

    if (!entry && !beer && !studyShown && outfits.length === 0 && recipes.length === 0 && yearTrips.length === 0) return [];
    return [
      {
        yearsAgo: year.yearsAgo,
        date: (entry && dayKey(entry.date)) ?? year.keys[0],
        entry: entry ? toRow(entry) : null,
        beer,
        trips: yearTrips,
        study: studyShown,
        outfits,
        recipes,
      },
    ];
  });
}

/** One short line for a memory, for the Home tile: the day's last diary bit first, else what was logged. */
export function memoryHeadline(m: Memory): string {
  if (m.entry) return diaryBits(m.entry.text).at(-1) ?? "";
  const trip = m.trips[0];
  if (trip) return `Day ${trip.day} of ${trip.title}${trip.stop ? ` · ${trip.stop}` : ""}`;
  if (m.beer) {
    const where = m.beer.pubs[0] ? ` at ${m.beer.pubs[0].name}` : "";
    return m.beer.pints > 0 ? `${m.beer.pints} ${m.beer.pints === 1 ? "pint" : "pints"}${where}` : `A beer${where}`;
  }
  if (m.study) return m.study.dayOff ? "A day off studying" : `Studied ${m.study.hours.toLocaleString("nl-BE", { maximumFractionDigits: 2 })} h`;
  if (m.outfits[0]) return `Wore ${m.outfits[0].name}`;
  if (m.recipes[0]) return `Made ${m.recipes[0].name}`;
  return "";
}

export type DiaryGlance = { today: DiaryRow | null; memory: Memory | null };

async function loadDiaryGlance(todayKey: string): Promise<DiaryGlance> {
  const [today, memories] = await Promise.all([getDiaryEntry(todayKey), getOnThisDay(todayKey)]);
  return { today, memory: memories[0] ?? null };
}
/** Cached per request: the Home tile and its mascot's mood share one load. */
export const getDiaryGlance = cache(loadDiaryGlance);
