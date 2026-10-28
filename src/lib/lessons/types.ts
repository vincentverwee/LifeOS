import type { CategoryColorSlot } from "@/lib/categoryPalette";
import type { LessonKind, LessonStatus } from "@/lib/lessons/marks";

// Plain, serializable shapes of the Lessons tables (dates are "YYYY-MM-DD").

export type StudyCourse = {
  id: string;
  code: string;
  name: string;
  color: CategoryColorSlot;
  sortOrder: number;
  hasWc: boolean;
};

export type StudyEntry = {
  id: string;
  date: string;
  hours: number;
  courseId: string | null;
  note: string | null;
};

export type StudyExam = {
  id: string;
  courseId: string;
  date: string;
  kind: "exam" | "test";
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
};

/** The running study timer. `startedAt` is an ISO instant. */
export type StudyTimerState = {
  periodId: string;
  startedAt: string;
  courses: Pick<StudyCourse, "id" | "code" | "color">[];
};
