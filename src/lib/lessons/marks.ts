// Statuses of one lesson-grid cell, taken over from the Lessen3.1 legend.
// "attended" is the sheet's x, "missed" its o. Only attended counts as present.

export const LESSON_STATUSES = [
  "attended",
  "missed",
  "done",
  "not_done",
  "busy",
  "planned",
  "urgent",
  "no_class",
] as const;

export type LessonStatus = (typeof LESSON_STATUSES)[number];

export type LessonKind = "HC" | "WC";

export const LESSON_STATUS_INFO: Record<LessonStatus, { label: string; short: string; className: string }> = {
  attended: { label: "Attended", short: "✓", className: "bg-good/20 text-positive-text" },
  missed: { label: "Missed", short: "✗", className: "bg-critical/15 text-critical" },
  done: { label: "Done", short: "Done", className: "bg-good/20 text-positive-text" },
  not_done: { label: "Not done", short: "To do", className: "bg-critical/15 text-critical" },
  busy: { label: "Busy", short: "Busy", className: "bg-tag-yellow/25 text-foreground" },
  planned: { label: "Planned", short: "Plan", className: "bg-tag-blue/20 text-foreground" },
  urgent: { label: "Urgent", short: "!!", className: "bg-tag-violet/25 text-foreground" },
  no_class: { label: "No class", short: "–", className: "bg-surface-muted text-ink-muted" },
};

export function isLessonStatus(value: string): value is LessonStatus {
  return (LESSON_STATUSES as readonly string[]).includes(value);
}

/** Attendance like the sheet: x / every filled cell except "no class" and "planned". */
export function attendance(statuses: LessonStatus[]): { attended: number; given: number } {
  const given = statuses.filter((s) => s !== "no_class" && s !== "planned").length;
  return { attended: statuses.filter((s) => s === "attended").length, given };
}
