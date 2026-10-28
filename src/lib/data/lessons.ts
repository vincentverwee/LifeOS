import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { isCategoryColorSlot } from "@/lib/categoryPalette";
import { isLessonStatus } from "@/lib/lessons/marks";
import { EXAM_KINDS, type ExamKind, type StudyPeriod, type StudyTimerState } from "@/lib/lessons/types";
import { computePeriodStats, phaseLabel, pickCurrentPeriod } from "@/lib/lessons/stats";

const fullInclude = {
  courses: {
    orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
    include: { exams: { orderBy: { date: "asc" as const } }, lessons: true },
  },
  entries: { orderBy: [{ date: "asc" as const }, { createdAt: "asc" as const }] },
};

function findFullPeriod(id: string) {
  return prisma.studyPeriod.findUnique({ where: { id }, include: fullInclude });
}

type FullRow = NonNullable<Awaited<ReturnType<typeof findFullPeriod>>>;

type HeaderRow = {
  id: string;
  name: string;
  startDate: Date;
  blokStart: Date;
  endDate: Date;
  goalHours: { toNumber(): number };
  topDayHours: { toNumber(): number };
};

function toHeader(p: HeaderRow) {
  return {
    id: p.id,
    name: p.name,
    startDate: dayKey(p.startDate),
    blokStart: dayKey(p.blokStart),
    endDate: dayKey(p.endDate),
    goalHours: p.goalHours.toNumber(),
    topDayHours: p.topDayHours.toNumber(),
  };
}

function toStudyPeriod(p: FullRow): StudyPeriod {
  return {
    ...toHeader(p),
    courses: p.courses.map((c) => ({
      id: c.id,
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
          kind: (EXAM_KINDS as readonly string[]).includes(x.kind) ? (x.kind as ExamKind) : "exam",
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
  };
}

export type LoadedStudyPeriods = {
  /** every period, newest first; only `period` has its courses, exams and grid */
  periods: StudyPeriod[];
  /** the `?period=` one, else the one running today (or the latest), in full */
  period: StudyPeriod | null;
};

/**
 * The period a page shows, in full, plus all periods for the switcher. With
 * `peerEntries` the other periods carry their entries as date + hours (enough
 * for the pace comparisons and per-period totals); without, they're headers only.
 */
export async function loadStudyPeriods(
  requestedId: string | undefined,
  todayKey: string,
  { peerEntries = false }: { peerEntries?: boolean } = {}
): Promise<LoadedStudyPeriods> {
  const rows: (HeaderRow & { entries: { date: Date; hours: { toNumber(): number } }[] })[] = peerEntries
    ? await prisma.studyPeriod.findMany({
        orderBy: { startDate: "desc" },
        include: { entries: { orderBy: [{ date: "asc" }, { createdAt: "asc" }], select: { date: true, hours: true } } },
      })
    : (await prisma.studyPeriod.findMany({ orderBy: { startDate: "desc" } })).map((p) => ({ ...p, entries: [] }));
  const lean: StudyPeriod[] = rows.map((p) => ({
    ...toHeader(p),
    courses: [],
    exams: [],
    marks: [],
    entries: p.entries.map((e, i) => ({
      id: `${p.id}:${i}`,
      date: dayKey(e.date),
      hours: e.hours.toNumber(),
      courseId: null,
      note: null,
    })),
  }));

  const picked = resolveStudyPeriod(lean, requestedId, todayKey);
  const row = picked ? await findFullPeriod(picked.id) : null;
  const period = row ? toStudyPeriod(row) : null;
  return { periods: period ? lean.map((p) => (p.id === period.id ? period : p)) : lean, period };
}

/** The `?period=` one, else the period running today (or the latest). */
export function resolveStudyPeriod<T extends { id: string; startDate: string; endDate: string }>(
  periods: T[],
  requestedId: string | undefined,
  todayKey: string
): T | null {
  return periods.find((p) => p.id === requestedId) ?? pickCurrentPeriod(periods, todayKey);
}

export type LessonsGlance = {
  todayHours: number;
  weekHours: number;
  week: { label: string; hours: number }[];
  goalHours: number;
  status: string;
  nextExam: { label: string; daysUntil: number } | null;
  timer: StudyTimerState | null;
};

/** For the home tile. */
export async function getLessonsGlance(todayKey: string): Promise<LessonsGlance | null> {
  const [{ period }, timer] = await Promise.all([loadStudyPeriods(undefined, todayKey), getStudyTimer()]);
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
      ? { label: `${next.course?.name ?? "?"} ${next.exam.kind}`, daysUntil: next.daysUntil }
      : null,
    timer,
  };
}

/** The running study timer with its courses (in course order), or null. */
export async function getStudyTimer(): Promise<StudyTimerState | null> {
  const timer = await prisma.studyTimer.findUnique({ where: { id: "current" } });
  if (!timer) return null;
  const courses = timer.courseIds.length
    ? await prisma.studyCourse.findMany({
        where: { id: { in: timer.courseIds } },
        select: { id: true, name: true, color: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
    : [];
  return {
    periodId: timer.periodId,
    startedAt: timer.startedAt.toISOString(),
    courses: courses.map((c) => ({ ...c, color: isCategoryColorSlot(c.color) ? c.color : "blue" })),
  };
}
