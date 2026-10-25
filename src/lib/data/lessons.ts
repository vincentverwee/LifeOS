import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { isCategoryColorSlot } from "@/lib/categoryPalette";
import { isLessonStatus } from "@/lib/lessons/marks";
import type { StudyPeriod } from "@/lib/lessons/types";
import { computePeriodStats, phaseLabel, pickCurrentPeriod } from "@/lib/lessons/stats";

/** Every study period with its courses, entries, exams and lesson grid; newest first. */
export async function getStudyPeriods(): Promise<StudyPeriod[]> {
  const rows = await prisma.studyPeriod.findMany({
    orderBy: { startDate: "desc" },
    include: {
      courses: {
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: { exams: { orderBy: { date: "asc" } }, lessons: true },
      },
      entries: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
    },
  });

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: dayKey(p.startDate),
    blokStart: dayKey(p.blokStart),
    endDate: dayKey(p.endDate),
    goalHours: p.goalHours.toNumber(),
    topDayHours: p.topDayHours.toNumber(),
    courses: p.courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      color: isCategoryColorSlot(c.color) ? c.color : "blue",
      sortOrder: c.sortOrder,
      hasWc: c.hasWc,
    })),
    entries: p.entries.map((e) => ({
      id: e.id,
      date: dayKey(e.date),
      hours: e.hours.toNumber(),
      courseId: e.courseId,
      note: e.note,
    })),
    exams: p.courses
      .flatMap((c) =>
        c.exams.map((x) => ({
          id: x.id,
          courseId: c.id,
          date: dayKey(x.date),
          kind: x.kind === "test" ? ("test" as const) : ("exam" as const),
          note: x.note,
        }))
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
    marks: p.courses.flatMap((c) =>
      c.lessons
        .filter((m) => isLessonStatus(m.status))
        .map((m) => ({
          courseId: c.id,
          week: m.week,
          kind: m.kind === "WC" ? ("WC" as const) : ("HC" as const),
          status: m.status as StudyPeriod["marks"][number]["status"],
        }))
    ),
  }));
}

/** The `?period=` one, else the period running today (or the latest). */
export function resolveStudyPeriod(periods: StudyPeriod[], requestedId: string | undefined, todayKey: string) {
  return periods.find((p) => p.id === requestedId) ?? pickCurrentPeriod(periods, todayKey);
}

export type LessonsGlance = {
  todayHours: number;
  weekHours: number;
  week: { label: string; hours: number }[];
  goalHours: number;
  status: string;
  nextExam: { label: string; daysUntil: number } | null;
};

/** For the home tile. */
export async function getLessonsGlance(todayKey: string): Promise<LessonsGlance | null> {
  const period = pickCurrentPeriod(await getStudyPeriods(), todayKey);
  if (!period) return null;
  const stats = computePeriodStats(period, todayKey);
  const next = stats.upcomingExams[0];
  return {
    todayHours: stats.todayHours ?? 0,
    weekHours: stats.weekHours,
    week: stats.week.map(({ label, hours }) => ({ label, hours })),
    goalHours: period.goalHours,
    status: phaseLabel(stats.phase),
    nextExam: next
      ? { label: `${next.course?.code ?? "?"} ${next.exam.kind}`, daysUntil: next.daysUntil }
      : null,
  };
}
