import type { CategoryColorSlot } from "@/lib/categoryPalette";
import type { LessonKind, LessonStatus } from "@/lib/lessons/marks";

// Plain, serializable shapes of the Lessons tables (dates are "YYYY-MM-DD").

export type StudyCourse = {
  id: string;
  name: string;
  color: CategoryColorSlot;
  sortOrder: number;
  hasWc: boolean;
  /** Off = tracked time (Ekonomika, Projectvak): logged like study, kept out of every study number. */
  countsAsStudy: boolean;
  /** final grade out of 20, null = none yet (tracked courses never have one) */
  grade: number | null;
};

export const MAX_GRADE = 20;

/** A grade typed in the course form: empty = none, else 0–20 with "," or "." (one decimal kept). */
export function parseGrade(raw: string): { ok: true; grade: number | null } | { ok: false; error: string } {
  const text = raw.trim().replace(",", ".");
  if (text === "") return { ok: true, grade: null };
  const n = Number(text);
  if (!/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(n) || n < 0 || n > MAX_GRADE) {
    return { ok: false, error: `A grade is a number from 0 to ${MAX_GRADE}.` };
  }
  return { ok: true, grade: Math.round(n * 10) / 10 };
}

export type StudyEntry = {
  id: string;
  date: string;
  hours: number;
  courseId: string | null;
  note: string | null;
};

export const EXAM_KINDS = ["exam", "test", "deadline"] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

export type StudyExam = {
  id: string;
  courseId: string;
  date: string;
  kind: ExamKind;
  note: string | null;
};

export type LessonMark = {
  courseId: string;
  week: number;
  kind: LessonKind;
  status: LessonStatus;
};

export type StudyPeriod = {
  id: string;
  name: string;
  /** Monday of lesson week 1 */
  startDate: string;
  blokStart: string;
  /** the last exam; periods are compared counting down to this day */
  endDate: string;
  goalHours: number;
  topDayHours: number;
  courses: StudyCourse[];
  /** sorted by date */
  entries: StudyEntry[];
  /** sorted by date */
  exams: StudyExam[];
  marks: LessonMark[];
  /**
   * Courses with `countsAsStudy` off and their entries. Kept apart so every study number,
   * chart, grid and notification (which read `courses`/`entries`/`exams`/`marks`) leaves
   * them out; only Log time, Settings and /lessons/tracked use them. Empty on lean periods.
   */
  trackedCourses: StudyCourse[];
  trackedEntries: StudyEntry[];
};

/** The running study timer. `startedAt` is an ISO instant. */
export type StudyTimerState = {
  periodId: string;
  startedAt: string;
  courses: Pick<StudyCourse, "id" | "name" | "color">[];
};
