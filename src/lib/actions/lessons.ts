"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatDate, parseDateKey, parseHours } from "@/lib/format";
import { knownError } from "@/lib/prismaErrors";
import { getTodayKey } from "@/lib/today";
import { isCategoryColorSlot } from "@/lib/categoryPalette";
import { isLessonStatus, type LessonKind } from "@/lib/lessons/marks";

function revalidateLessonRoutes() {
  revalidatePath("/"); // hub shows today's hours
  revalidatePath("/lessons", "layout");
}

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

/** Weeks in the lesson grid are capped well above any real semester. */
const MAX_WEEK = 60;

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

/**
 * Splits `hours` equally over the courses in whole hundredths: the first ones
 * take the leftover hundredths, so the parts always add up and none is negative.
 */
function splitHours(hours: number, parts: number): number[] {
  const cents = Math.round(hours * 100);
  const base = Math.floor(cents / parts);
  return Array.from({ length: parts }, (_, i) => (base + (i < cents % parts ? 1 : 0)) / 100);
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

  // No date (the form sends "" before hydration) means today; a bad one is an error.
  const rawDate = formData.get("date");
  const dateKey = rawDate ? parseDateKey(rawDate) : await getTodayKey();
  if (!dateKey) return { ok: false, error: "Pick a valid date." };
  const date = utc(dateKey);
  const target = await resolvePeriod(periodId, date);
  if (!target.ok) return target;

  const courses = courseIds.length
    ? await prisma.studyCourse.findMany({ where: { id: { in: courseIds }, periodId: target.period.id }, select: { id: true } })
    : [];
  if (courses.length !== courseIds.length) {
    return { ok: false, error: "Those courses belong to another period; pick them again." };
  }

  if (hours > 0 && Math.round(hours * 100) < courses.length) {
    return { ok: false, error: "Too little time to split over that many courses." };
  }

  // Studied time is split over the courses. A 0 h day off is one row: it keeps
  // its course only when exactly one was picked.
  const split = courses.length > 0 && hours > 0;
  const shares = split ? splitHours(hours, courses.length) : [hours];
  await prisma.studyEntry.createMany({
    data: shares.map((share, i) => ({
      periodId: target.period.id,
      courseId: split ? courses[i].id : courses.length === 1 ? courses[0].id : null,
      date,
      hours: share,
      note: i === 0 ? (note?.slice(0, 500) ?? null) : null,
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
  const note = input.note?.trim().slice(0, 500) || null;
  if (input.hours === 0 && !note) return { ok: false, error: "A 0 h entry needs a note (a day off)." };
  // Editing never falls back to today: a cleared date field is a mistake.
  const dateKey = parseDateKey(input.date);
  if (!dateKey) return { ok: false, error: "Pick a valid date." };
  if (dateKey > (await getTodayKey())) return { ok: false, error: "That date is in the future." };

  const existing = await prisma.studyEntry.findUnique({ where: { id: input.id }, select: { periodId: true } });
  if (!existing) return { ok: false, error: "That entry no longer exists." };
  const date = utc(dateKey);
  const target = await resolvePeriod(existing.periodId, date);
  if (!target.ok) return target;
  if (input.courseId) {
    const course = await prisma.studyCourse.findFirst({ where: { id: input.courseId, periodId: target.period.id } });
    if (!course) return { ok: false, error: "That course isn't part of this period." };
  }

  try {
    await prisma.studyEntry.update({
      where: { id: input.id },
      data: {
        periodId: target.period.id,
        courseId: input.courseId,
        date,
        hours: Math.round(input.hours * 100) / 100,
        note,
      },
    });
  } catch (e) {
    return knownError(e, { P2025: "That entry no longer exists.", P2003: "That course no longer exists." });
  }
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
  if (!Number.isInteger(input.week) || input.week < 1 || input.week > MAX_WEEK) {
    return { ok: false, error: "Invalid week." };
  }
  if (input.kind !== "HC" && input.kind !== "WC") return { ok: false, error: "Invalid lesson kind." };
  const where = { courseId_week_kind: { courseId: input.courseId, week: input.week, kind: input.kind } };

  if (input.status === null) {
    await prisma.lessonMark.deleteMany({ where: { courseId: input.courseId, week: input.week, kind: input.kind } });
  } else {
    if (!isLessonStatus(input.status)) return { ok: false, error: "Unknown status." };
    try {
      await prisma.lessonMark.upsert({
        where,
        create: { courseId: input.courseId, week: input.week, kind: input.kind, status: input.status },
        update: { status: input.status },
      });
    } catch (e) {
      // P2002: a parallel tap created the cell first; P2003: the course was deleted.
      return knownError(e, { P2002: "That cell changed meanwhile; tap again.", P2003: "That course no longer exists." });
    }
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

function validatePeriod(input: StudyPeriodInput, { requireMonday = true } = {}): string | null {
  if (!input.name.trim()) return "Give the period a name.";
  if (input.name.trim().length > 60) return "Keep the name under 60 characters.";
  if (![input.startDate, input.blokStart, input.endDate].every((d) => parseDateKey(d))) {
    return "Pick the start, blok start and last exam dates.";
  }
  // Lesson weeks are 7-day blocks from the start, so they must line up with Mon-Sun weeks.
  if (requireMonday && utc(input.startDate).getUTCDay() !== 1) return "The start date must be a Monday (lesson week 1).";
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
  let period;
  try {
    period = await prisma.studyPeriod.create({ data: periodData(input), select: { id: true } });
  } catch (e) {
    return knownError(e, { P2002: "A period with that name already exists." });
  }
  revalidateLessonRoutes();
  return { ok: true, id: period.id };
}

export async function updateStudyPeriod(input: StudyPeriodInput & { id: string }): Promise<LessonsResult> {
  await requireAuth();
  // Older imported periods may start on another weekday; only a changed start must be a Monday.
  const current = await prisma.studyPeriod.findUnique({ where: { id: input.id }, select: { startDate: true } });
  const error = validatePeriod(input, {
    requireMonday: !current || current.startDate.toISOString().slice(0, 10) !== input.startDate,
  });
  if (error) return { ok: false, error };
  try {
    await prisma.studyPeriod.update({ where: { id: input.id }, data: periodData(input) });
  } catch (e) {
    return knownError(e, {
      P2002: "A period with that name already exists.",
      P2025: "That period no longer exists.",
    });
  }
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
  if (input.code.trim().length > 12) return "Keep the code short (12 characters at most).";
  if (input.name.trim().length > 80) return "Keep the name under 80 characters.";
  if (!isCategoryColorSlot(input.color)) return "Pick a colour.";
  return null;
}

export async function createStudyCourse(periodId: string, input: StudyCourseInput): Promise<LessonsResult> {
  await requireAuth();
  const error = validateCourse(input);
  if (error) return { ok: false, error };
  const code = input.code.trim();
  const last = await prisma.studyCourse.findFirst({ where: { periodId }, orderBy: { sortOrder: "desc" } });
  try {
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
  } catch (e) {
    return knownError(e, {
      P2002: `${code} already exists in this period.`,
      P2003: "That period no longer exists.",
    });
  }
  revalidateLessonRoutes();
  return { ok: true };
}

export async function updateStudyCourse(id: string, input: StudyCourseInput): Promise<LessonsResult> {
  await requireAuth();
  const error = validateCourse(input);
  if (error) return { ok: false, error };
  const code = input.code.trim();
  try {
    await prisma.studyCourse.update({
      where: { id },
      data: { code, name: input.name.trim() || code, color: input.color, hasWc: input.hasWc },
    });
  } catch (e) {
    return knownError(e, {
      P2002: `${code} already exists in this period.`,
      P2025: "That course no longer exists.",
    });
  }
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
  if (!parseDateKey(input.date)) return { ok: false, error: "Pick a date." };
  if (input.kind !== "exam" && input.kind !== "test") return { ok: false, error: "Invalid kind." };
  const course = await prisma.studyCourse.findUnique({ where: { id: input.courseId }, select: { id: true } });
  if (!course) return { ok: false, error: "Pick a course." };
  await prisma.studyExam.create({
    data: { courseId: course.id, date: utc(input.date), kind: input.kind, note: input.note?.trim().slice(0, 200) || null },
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
