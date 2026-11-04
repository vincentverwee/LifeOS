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
};

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
