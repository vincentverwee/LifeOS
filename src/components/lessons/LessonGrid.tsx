"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { LessonMark, StudyCourse } from "@/lib/lessons/types";
import { LESSON_STATUSES, LESSON_STATUS_INFO, attendance, type LessonKind, type LessonStatus } from "@/lib/lessons/marks";
import { setLessonMark } from "@/lib/actions/lessons";
import { Sheet } from "@/components/recipes/Sheet";
import { formatPercent } from "@/lib/format";

type Cell = { courseId: string; week: number; kind: LessonKind };
const cellKey = (c: Cell) => `${c.courseId}:${c.week}:${c.kind}`;

const weekFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function weekStart(startDate: string, week: number): string {
  return new Date(Date.parse(`${startDate}T00:00:00Z`) + (week - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
}

/** Marks keyed by cell, updated optimistically while the server action runs. */
function useMarks(initial: LessonMark[]) {
  const [marks, setMarks] = useState(() => new Map(initial.map((m) => [cellKey(m), m.status])));
  // What the server last confirmed per cell, and the newest request per cell: a failed
  // tap only rolls back when no later tap on that cell is on its way, and then to the
  // confirmed status rather than to whatever the screen showed before it.
  const confirmed = useRef(new Map(initial.map((m) => [cellKey(m), m.status])));
  const latest = useRef(new Map<string, number>());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function set(cell: Cell, status: LessonStatus | null) {
    const key = cellKey(cell);
    const seq = (latest.current.get(key) ?? 0) + 1;
    latest.current.set(key, seq);
    setMarks((prev) => {
      const next = new Map(prev);
      if (status) next.set(key, status);
      else next.delete(key);
      return next;
    });
    setError(null);
    startTransition(async () => {
      const result = await setLessonMark({ ...cell, status });
      if (result.ok) {
        if (status) confirmed.current.set(key, status);
        else confirmed.current.delete(key);
        return;
      }
      if (latest.current.get(key) !== seq) return;
      setError(result.error);
      const back = confirmed.current.get(key);
      setMarks((prev) => {
        const next = new Map(prev);
        if (back) next.set(key, back);
        else next.delete(key);
        return next;
      });
    });
  }

  return { get: (cell: Cell) => marks.get(cellKey(cell)), all: marks, set, error };
}

function StatusSheet({
  cell,
  title,
  current,
  onPick,
  onClose,
}: {
  cell: Cell | null;
  title: string;
  current: LessonStatus | undefined;
  onPick: (status: LessonStatus | null) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={cell !== null} onOpenChange={(open) => !open && onClose()} title={title}>
      <div className="grid grid-cols-2 gap-2">
        {LESSON_STATUSES.map((status) => {
          const info = LESSON_STATUS_INFO[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => onPick(status)}
              aria-pressed={current === status}
              className={`btn flex min-h-12 items-center justify-start gap-2 border px-3 text-sm ${
                current === status ? "border-primary" : "border-border"
              }`}
            >
              <span className={`inline-flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 text-xs font-semibold ${info.className}`}>
                {info.short}
              </span>
              <span className="text-foreground">{info.label}</span>
            </button>
          );
        })}
      </div>
      {current && (
        <button type="button" onClick={() => onPick(null)} className="btn btn-ghost mt-3 min-h-11 w-full text-sm">
          Clear
        </button>
      )}
    </Sheet>
  );
}

function MarkBadge({ status }: { status: LessonStatus | undefined }) {
  if (!status) return <span className="text-gridline">·</span>;
  const info = LESSON_STATUS_INFO[status];
  return (
    <span className={`inline-flex h-8 w-full items-center justify-center rounded-md px-1 text-xs font-semibold ${info.className}`}>
      {info.short}
    </span>
  );
}

function columnsOf(courses: StudyCourse[]) {
  return courses.flatMap((course) => [
    { course, kind: "HC" as const },
    ...(course.hasWc ? [{ course, kind: "WC" as const }] : []),
  ]);
}

type LessonGridProps = {
  courses: StudyCourse[];
  marks: LessonMark[];
  startDate: string;
  blokStart: string;
  weekCount: number;
  currentWeek: number;
};

/** Course × week grid. Tap a cell to set its status. */
export function LessonGrid({ courses, marks: initial, startDate, blokStart, weekCount, currentWeek }: LessonGridProps) {
  const marks = useMarks(initial);
  const [open, setOpen] = useState<Cell | null>(null);
  const columns = columnsOf(courses);
  const openCourse = courses.find((c) => c.id === open?.courseId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLTableRowElement>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);

  // Open on the current week: scroll it to just under the sticky header row.
  useEffect(() => {
    const box = scrollRef.current;
    const row = currentRowRef.current;
    if (box && row) box.scrollTop = row.offsetTop - (headRef.current?.offsetHeight ?? 0);
  }, []);

  if (courses.length === 0) return <p className="text-sm text-ink-muted">Add courses in Settings to start the grid.</p>;

  return (
    <div className="flex flex-col gap-2">
      {marks.error && <p className="text-sm text-critical">{marks.error}</p>}
      {/* One scroll box for both axes, sized to the screen, so the course header row and the
          week column both stay in view (sticky only works inside the element that scrolls). */}
      <div
        ref={scrollRef}
        className="-mx-4 max-h-[calc(100svh-16.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-80 overflow-auto overscroll-contain border-y border-border bg-surface sm:mx-0 sm:max-h-[75vh] sm:rounded-xl sm:border"
      >
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead ref={headRef}>
            <tr>
              <th className="sticky top-0 left-0 z-20 border-r border-b border-border bg-surface px-3 py-2 text-left font-medium text-ink-muted">Week</th>
              {columns.map(({ course, kind }) => (
                <th key={`${course.id}${kind}`} className="sticky top-0 z-10 border-b border-border bg-surface px-1.5 py-2 text-center font-medium">
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--color-tag-${course.color})` }} aria-hidden="true" />
                      {course.code}
                    </span>
                    <span className="text-xs font-normal text-ink-muted">{kind}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: weekCount }, (_, i) => i + 1).map((week) => {
              const start = weekStart(startDate, week);
              const isBlok = weekStart(startDate, week + 1) > blokStart;
              const isCurrent = week === currentWeek;
              return (
                <tr key={week} ref={isCurrent ? currentRowRef : undefined} className={isCurrent ? "bg-surface-muted" : undefined}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 border-r border-b border-border px-3 py-1.5 text-left font-normal whitespace-nowrap ${
                      isCurrent ? "bg-surface-muted" : "bg-surface"
                    }`}
                  >
                    <span className="block font-medium text-foreground">
                      W{week}
                      {isBlok && <span className="ml-1 text-xs font-normal text-ink-muted">blok</span>}
                    </span>
                    <span className="text-xs text-ink-muted">{weekFormatter.format(new Date(`${start}T00:00:00Z`))}</span>
                  </th>
                  {columns.map(({ course, kind }) => {
                    const cell = { courseId: course.id, week, kind };
                    return (
                      <td key={`${course.id}${kind}`} className="border-b border-border p-1 text-center">
                        <button
                          type="button"
                          onClick={() => setOpen(cell)}
                          aria-label={`${course.code} ${kind} week ${week}: ${LESSON_STATUS_INFO[marks.get(cell)!]?.label ?? "empty"}`}
                          className="tap flex h-11 w-14 items-center justify-center rounded-md"
                        >
                          <MarkBadge status={marks.get(cell)} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="sticky bottom-0 left-0 z-20 border-r border-border bg-surface shadow-[0_-1px_0_var(--color-border)] px-3 py-2 text-left text-xs font-medium text-ink-muted">Attended</th>
              {columns.map(({ course, kind }) => {
                const statuses = [...marks.all]
                  .filter(([key]) => key.startsWith(`${course.id}:`) && key.endsWith(`:${kind}`))
                  .map(([, s]) => s);
                const { attended, given } = attendance(statuses);
                return (
                  <td key={`${course.id}${kind}`} className="sticky bottom-0 z-10 bg-surface px-1 py-2 shadow-[0_-1px_0_var(--color-border)] text-center font-mono text-xs tabular-nums text-ink-muted">
                    {given ? formatPercent((attended / given) * 100) : "–"}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <StatusSheet
        cell={open}
        title={open && openCourse ? `${openCourse.code} ${open.kind} · week ${open.week}` : ""}
        current={open ? marks.get(open) : undefined}
        onPick={(status) => {
          if (open) marks.set(open, status);
          setOpen(null);
        }}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

/** This week's lessons as one row per course/kind — for the Today page. */
export function WeekLessons({ courses, marks: initial, week }: { courses: StudyCourse[]; marks: LessonMark[]; week: number }) {
  const marks = useMarks(initial);
  const [open, setOpen] = useState<Cell | null>(null);
  const columns = columnsOf(courses);
  const openCourse = courses.find((c) => c.id === open?.courseId);

  return (
    <>
      {marks.error && <p className="px-4 pb-2 text-sm text-critical">{marks.error}</p>}
      <ul className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3">
        {columns.map(({ course, kind }) => {
          const cell = { courseId: course.id, week, kind };
          return (
            <li key={`${course.id}${kind}`}>
              <button
                type="button"
                onClick={() => setOpen(cell)}
                className="tap flex min-h-12 w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-tag-${course.color})` }} aria-hidden="true" />
                <span className="flex-1 truncate text-foreground">
                  {course.code} <span className="text-ink-muted">{kind}</span>
                </span>
                <span className="w-12 shrink-0">
                  <MarkBadge status={marks.get(cell)} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <StatusSheet
        cell={open}
        title={open && openCourse ? `${openCourse.code} ${open.kind} · week ${open.week}` : ""}
        current={open ? marks.get(open) : undefined}
        onPick={(status) => {
          if (open) marks.set(open, status);
          setOpen(null);
        }}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
