import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { dayKeyIn } from "@/lib/timeZone";
import { addDays } from "@/lib/reminders/schedule";
import { STUDY_ENTRY_WHERE } from "@/lib/data/lessons";
import { summarizeWeek, weekDays, type RawExpense, type WeekSummary } from "@/lib/review/week";

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

const EXPENSE_SELECT = {
  date: true,
  amount: true,
  pints: true,
  sizeMl: true,
  category: { select: { name: true, pintPrice: true } },
  pub: { select: { name: true } },
} as const;

type ExpenseRow = {
  date: Date;
  amount: { toNumber(): number };
  pints: number | null;
  sizeMl: number | null;
  category: { name: string; pintPrice: { toNumber(): number } | null };
  pub: { name: string } | null;
};

function toRawExpense(e: ExpenseRow): RawExpense {
  return {
    date: dayKey(e.date),
    amount: e.amount.toNumber(),
    category: e.category.name,
    pintPrice: e.category.pintPrice?.toNumber() ?? null,
    pints: e.pints,
    sizeMl: e.sizeMl,
    pub: e.pub?.name ?? null,
  };
}

/**
 * Everything the weekly review shows for the week from `monday` (up to today
 * for the running week), plus last week's same days for the comparisons.
 * One query per source, all on indexed date columns; never route geometry.
 */
export async function getWeekReview(monday: string, todayKey: string, tz: string): Promise<WeekSummary> {
  const days = weekDays(monday, todayKey);
  const lastDay = days.at(-1) ?? monday;
  const range = { gte: utc(monday), lte: utc(lastDay) };
  const prevRange = { gte: utc(addDays(monday, -7)), lte: utc(addDays(lastDay, -7)) };
  const overlaps = { startDate: { lte: utc(lastDay) }, endDate: { gte: utc(monday) } };

  const [
    expenses,
    prevExpenses,
    cycles,
    budgetTrips,
    studyPeriod,
    studyEntries,
    prevStudy,
    diary,
    routineLogs,
    reminders,
    outfitWears,
    itemWears,
    myRecipes,
    savedRecipes,
    trips,
    workouts,
    prevWorkouts,
    workoutGoal,
    win,
  ] = await Promise.all([
    prisma.expense.findMany({ where: { date: range }, select: EXPENSE_SELECT }),
    prisma.expense.findMany({ where: { date: prevRange }, select: EXPENSE_SELECT }),
    prisma.budgetCycle.findMany({ where: overlaps, select: { startingBudget: true, startDate: true, endDate: true } }),
    prisma.trip.findMany({ where: overlaps, select: { totalBudget: true, startDate: true, endDate: true } }),
    prisma.studyPeriod.findFirst({
      where: overlaps,
      orderBy: { startDate: "desc" },
      select: { startDate: true, endDate: true, goalHours: true },
    }),
    prisma.studyEntry.findMany({ where: { date: range, ...STUDY_ENTRY_WHERE }, select: { date: true, hours: true, note: true } }),
    prisma.studyEntry.aggregate({ where: { date: prevRange, ...STUDY_ENTRY_WHERE }, _sum: { hours: true } }),
    prisma.diaryEntry.findMany({ where: { date: range }, select: { date: true, text: true, mood: true } }),
    prisma.routineLog.findMany({
      where: { doneOn: range },
      select: { routine: { select: { name: true, source: true } } },
    }),
    // One-offs finished this week; doneAt is a moment, so widen by a day and check the local day.
    prisma.reminder.findMany({
      where: { repeat: "once", doneAt: { gte: utc(addDays(monday, -1)), lt: utc(addDays(lastDay, 2)) } },
      select: { title: true, doneAt: true },
    }),
    prisma.outfitWear.findMany({ where: { wornOn: range }, select: { outfit: { select: { name: true } } } }),
    prisma.itemWear.count({ where: { wornOn: range } }),
    prisma.myRecipe.findMany({ where: { lastMadeOn: range }, select: { title: true } }),
    prisma.savedRecipe.findMany({ where: { madeOn: range }, select: { title: true } }),
    prisma.waypointTrip.findMany({
      where: { startDate: { lte: utc(lastDay) }, OR: [{ endDate: { gte: utc(monday) } }, { endDate: null }] },
      select: {
        title: true,
        startDate: true,
        endDate: true,
        locations: { orderBy: { visitOrder: "asc" }, select: { name: true, city: true, arrivalDate: true } },
      },
    }),
    prisma.workout.findMany({
      where: { date: range, endedAt: { not: null } },
      select: { date: true, durationMin: true, distanceKm: true, activity: { select: { name: true } } },
    }),
    prisma.workout.count({ where: { date: prevRange, endedAt: { not: null } } }),
    prisma.workoutGoal.findUnique({ where: { id: "current" }, select: { perWeek: true } }),
    prisma.weekReview.findUnique({ where: { weekStart: utc(monday) }, select: { win: true } }),
  ]);

  return summarizeWeek({
    monday,
    todayKey,
    expenses: expenses.map(toRawExpense),
    prevExpenses: prevExpenses.map(toRawExpense),
    // Trips first, so a trip wins over the month (as everywhere else).
    budgetRanges: [
      ...budgetTrips.map((t) => ({ budget: t.totalBudget.toNumber(), start: dayKey(t.startDate), end: dayKey(t.endDate) })),
      ...cycles.map((c) => ({ budget: c.startingBudget.toNumber(), start: dayKey(c.startDate), end: dayKey(c.endDate) })),
    ],
    studyPeriod: studyPeriod
      ? { startDate: dayKey(studyPeriod.startDate), endDate: dayKey(studyPeriod.endDate), goalHours: studyPeriod.goalHours.toNumber() }
      : null,
    studyEntries: studyEntries.map((e) => ({ date: dayKey(e.date), hours: e.hours.toNumber(), note: e.note })),
    prevStudyHours: prevStudy._sum.hours?.toNumber() ?? 0,
    diary: diary.map((d) => ({ date: dayKey(d.date), text: d.text, mood: d.mood })),
    routineLogs: routineLogs.map((l) => ({ name: l.routine.name, source: l.routine.source })),
    remindersDone: reminders
      .filter((r) => r.doneAt && days.includes(dayKeyIn(tz, r.doneAt)))
      .map((r) => r.title),
    outfitWears: outfitWears.map((w) => ({ name: w.outfit.name })),
    itemWears,
    recipes: [...myRecipes, ...savedRecipes].map((r) => r.title),
    trips: trips.map((t) => ({
      title: t.title,
      start: t.startDate ? dayKey(t.startDate) : null,
      end: t.endDate ? dayKey(t.endDate) : null,
      stops: t.locations
        .filter((l) => l.arrivalDate && days.includes(dayKey(l.arrivalDate)))
        .map((l) => l.city || l.name),
    })),
    workouts: workouts.map((w) => ({
      date: dayKey(w.date),
      activity: w.activity.name,
      minutes: w.durationMin ?? 0,
      km: w.distanceKm === null ? null : w.distanceKm.toNumber(),
    })),
    prevWorkouts,
    workoutGoal: workoutGoal?.perWeek ?? null,
    win: win?.win ?? null,
  });
}
