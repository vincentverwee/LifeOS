"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatDate, parseHours } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { isCategoryColorSlot } from "@/lib/categoryPalette";
import { isLessonStatus, type LessonKind } from "@/lib/lessons/marks";

function revalidateLessonRoutes() {
  revalidatePath("/"); // hub shows today's hours
  revalidatePath("/lessons", "layout");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const utc = (key: string) => new Date(`${key}T00:00:00Z`);

async function parseDateOnly(value: unknown): Promise<Date> {
  return utc(typeof value === "string" && DATE_RE.test(value) ? value : await getTodayKey());
}

export type LessonsResult = { ok: true } | { ok: false; error: string };

// --- Study entries ---

/**
 * The period an entry on `date` belongs to: the picked one if it covers the
 * date, else whichever period does.
 */
async function resolvePeriod(periodId: string, date: Date) {
  const picked = await prisma.studyPeriod.findUnique({
    where: { id: periodId },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (picked && date >= picked.startDate && date <= picked.endDate) return { ok: true as const, period: picked };
  const covering = await prisma.studyPeriod.findFirst({
    where: { startDate: { lte: date }, endDate: { gte: date } },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (covering) return { ok: true as const, period: covering };
  return { ok: false as const, error: `No study period covers ${formatDate(date)}.` };
}

/** Splits `hours` equally over the courses; the last one takes the rounding rest. */
function splitHours(hours: number, parts: number): number[] {
  const share = Math.round((hours / parts) * 100) / 100;
  return Array.from({ length: parts }, (_, i) =>
    i === parts - 1 ? Math.round((hours - share * (parts - 1)) * 100) / 100 : share
  );
}

export type StudyEntryFormState = ({ ok: true; hours: number; movedTo: string | null } | { ok: false; error: string }) | null;

export async function createStudyEntriesFromForm(
  _prev: StudyEntryFormState,
  formData: FormData
): Promise<StudyEntryFormState> {
  await requireAuth();
  const periodId = String(formData.get("periodId") ?? "");
  const hours = parseHours(String(formData.get("hours") ?? ""));
  const courseIds = formData.getAll("courseId").map(String).filter(Boolean);
  const noteRaw = formData.get("note");
  const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

  if (hours === null) return { ok: false, error: "Enter a time, e.g. 1,5 or 1:30 or 90m." };
  if (hours > 24) return { ok: false, error: "That's more than a day." };
  if (hours === 0 && !note) return { ok: false, error: "Enter the hours studied, or add a note for a day off." };

  const date = await parseDateOnly(formData.get("date"));
  const target = await resolvePeriod(periodId, date);
  if (!target.ok) return target;

  const courses = courseIds.length
    ? await prisma.studyCourse.findMany({ where: { id: { in: courseIds }, periodId: target.period.id }, select: { id: true } })
    : [];
  if (courses.length !== courseIds.length) {
    return { ok: false, error: "Those courses belong to another period; pick them again." };
  }

  const shares = courses.length && hours > 0 ? splitHours(hours, courses.length) : [hours];
  await prisma.studyEntry.createMany({
    data: shares.map((share, i) => ({
      periodId: target.period.id,
      courseId: courses.length && hours > 0 ? courses[i].id : (courses[0]?.id ?? null),
      date,
      hours: share,
      note: i === 0 ? note : null,
    })),
  });

  revalidateLessonRoutes();
  return { ok: true, hours, movedTo: target.period.id !== periodId ? target.period.name : null };
}

export async function updateStudyEntry(input: {
  id: string;
  hours: number;
  courseId: string | null;
  date: string;
  note: string | null;
}): Promise<LessonsResult> {
  await requireAuth();
  if (!Number.isFinite(input.hours) || input.hours < 0 || input.hours > 24) {
    return { ok: false, error: "Enter between 0 and 24 hours." };
  }
  const existing = await prisma.studyEntry.findUnique({ where: { id: input.id }, select: { periodId: true } });
  if (!existing) return { ok: false, error: "That entry no longer exists." };
  const date = await parseDateOnly(input.date);
  const target = await resolvePeriod(existing.periodId, date);
  if (!target.ok) return target;
  if (input.courseId) {
    const course = await prisma.studyCourse.findFirst({ where: { id: input.courseId, periodId: target.period.id } });
    if (!course) return { ok: false, error: "That course isn't part of this period." };
  }

  await prisma.studyEntry.update({
    where: { id: input.id },
    data: {
      periodId: target.period.id,
      courseId: input.courseId,
      date,
      hours: Math.round(input.hours * 100) / 100,
      note: input.note?.trim() || null,
    },
  });
  revalidateLessonRoutes();
  return { ok: true };
}

export async function deleteStudyEntry(id: string): Promise<LessonsResult> {
  await requireAuth();
  const deleted = await prisma.studyEntry.deleteMany({ where: { id } });
  if (deleted.count === 0) return { ok: false, error: "That entry no longer exists." };
  revalidateLessonRoutes();
  return { ok: true };
}

// --- Lesson grid ---

/** Sets one grid cell; a null status clears it. */
export async function setLessonMark(input: {
  courseId: string;
  week: number;
  kind: LessonKind;
  status: string | null;
}): Promise<LessonsResult> {
  await requireAuth();
  if (!Number.isInteger(input.week) || input.week < 1) return { ok: false, error: "Invalid week." };
  if (input.kind !== "HC" && input.kind !== "WC") return { ok: false, error: "Invalid lesson kind." };
  const where = { courseId_week_kind: { courseId: input.courseId, week: input.week, kind: input.kind } };

  if (input.status === null) {
    await prisma.lessonMark.deleteMany({ where: { courseId: input.courseId, week: input.week, kind: input.kind } });
  } else {
    if (!isLessonStatus(input.status)) return { ok: false, error: "Unknown status." };
    await prisma.lessonMark.upsert({
      where,
      create: { courseId: input.courseId, week: input.week, kind: input.kind, status: input.status },
      update: { status: input.status },
    });
  }
  revalidateLessonRoutes();
  return { ok: true };
}

// --- Periods ---

export type StudyPeriodInput = {
  name: string;
  startDate: string;
  blokStart: string;
  endDate: string;
  goalHours: number;
  topDayHours: number;
};

function validatePeriod(input: StudyPeriodInput): string | null {
  if (!input.name.trim()) return "Give the period a name.";
  if (![input.startDate, input.blokStart, input.endDate].every((d) => DATE_RE.test(d))) {
    return "Pick the start, blok start and last exam dates.";
  }
  if (!(input.startDate <= input.blokStart && input.blokStart <= input.endDate)) {
    return "Dates must be in order: start ≤ blok start ≤ last exam.";
  }
  if (!(input.goalHours > 0 && input.goalHours <= 24)) return "Daily goal must be between 0 and 24 h.";
  if (!(input.topDayHours > 0 && input.topDayHours <= 24)) return "Top day must be between 0 and 24 h.";
  return null;
}

function periodData(input: StudyPeriodInput) {
  return {
    name: input.name.trim(),
    startDate: utc(input.startDate),
    blokStart: utc(input.blokStart),
    endDate: utc(input.endDate),
    goalHours: input.goalHours,
    topDayHours: input.topDayHours,
  };
}

export async function createStudyPeriod(
  input: StudyPeriodInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAuth();
  const error = validatePeriod(input);
  if (error) return { ok: false, error };
  if (await prisma.studyPeriod.findUnique({ where: { name: input.name.trim() } })) {
    return { ok: false, error: "A period with that name already exists." };
  }
  const period = await prisma.studyPeriod.create({ data: periodData(input), select: { id: true } });
  revalidateLessonRoutes();
  return { ok: true, id: period.id };
}

export async function updateStudyPeriod(input: StudyPeriodInput & { id: string }): Promise<LessonsResult> {
  await requireAuth();
  const error = validatePeriod(input);
  if (error) return { ok: false, error };
  const clash = await prisma.studyPeriod.findFirst({
    where: { name: input.name.trim(), id: { not: input.id } },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "A period with that name already exists." };
  await prisma.studyPeriod.update({ where: { id: input.id }, data: periodData(input) });
  revalidateLessonRoutes();
  return { ok: true };
}

export async function deleteStudyPeriod(id: string): Promise<LessonsResult> {
  await requireAuth();
  await prisma.studyPeriod.deleteMany({ where: { id } });
  revalidateLessonRoutes();
  return { ok: true };
}

// --- Courses ---

export type StudyCourseInput = { code: string; name: string; color: string; hasWc: boolean };

function validateCourse(input: StudyCourseInput): string | null {
  if (!input.code.trim()) return "Give the course a short code, e.g. DBT.";
  if (!isCategoryColorSlot(input.color)) return "Pick a colour.";
  return null;
}

export async function createStudyCourse(periodId: string, input: StudyCourseInput): Promise<LessonsResult> {
  await requireAuth();
  const error = validateCourse(input);
  if (error) return { ok: false, error };
  const code = input.code.trim();
  if (await prisma.studyCourse.findFirst({ where: { periodId, code } })) {
    return { ok: false, error: `${code} already exists in this period.` };
  }
  const last = await prisma.studyCourse.findFirst({ where: { periodId }, orderBy: { sortOrder: "desc" } });
  await prisma.studyCourse.create({
    data: {
      periodId,
      code,
      name: input.name.trim() || code,
      color: input.color,
      hasWc: input.hasWc,
      sortOrder: (last?.sortOrder ?? 0) + 10,
    },
  });
  revalidateLessonRoutes();
  return { ok: true };
}

export async function updateStudyCourse(id: string, input: StudyCourseInput): Promise<LessonsResult> {
  await requireAuth();
  const error = validateCourse(input);
  if (error) return { ok: false, error };
  const course = await prisma.studyCourse.findUnique({ where: { id }, select: { periodId: true } });
  if (!course) return { ok: false, error: "That course no longer exists." };
  const code = input.code.trim();
  const clash = await prisma.studyCourse.findFirst({ where: { periodId: course.periodId, code, id: { not: id } } });
  if (clash) return { ok: false, error: `${code} already exists in this period.` };
  await prisma.studyCourse.update({
    where: { id },
    data: { code, name: input.name.trim() || code, color: input.color, hasWc: input.hasWc },
  });
  revalidateLessonRoutes();
  return { ok: true };
}

/** Its logged hours stay, without a course. */
export async function deleteStudyCourse(id: string): Promise<LessonsResult> {
  await requireAuth();
  await prisma.studyCourse.deleteMany({ where: { id } });
  revalidateLessonRoutes();
  return { ok: true };
}

// --- Exams ---

export async function createStudyExam(input: {
  courseId: string;
  date: string;
  kind: "exam" | "test";
  note: string | null;
}): Promise<LessonsResult> {
  await requireAuth();
  if (!DATE_RE.test(input.date)) return { ok: false, error: "Pick a date." };
  if (input.kind !== "exam" && input.kind !== "test") return { ok: false, error: "Invalid kind." };
  const course = await prisma.studyCourse.findUnique({ where: { id: input.courseId }, select: { id: true } });
  if (!course) return { ok: false, error: "Pick a course." };
  await prisma.studyExam.create({
    data: { courseId: course.id, date: utc(input.date), kind: input.kind, note: input.note?.trim() || null },
  });
  revalidateLessonRoutes();
  return { ok: true };
}

export async function deleteStudyExam(id: string): Promise<LessonsResult> {
  await requireAuth();
  await prisma.studyExam.deleteMany({ where: { id } });
  revalidateLessonRoutes();
  return { ok: true };
}
