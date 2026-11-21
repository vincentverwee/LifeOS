"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/recipes/Sheet";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { UndoBar } from "@/components/ui/UndoBar";
import { calendarWeeks } from "@/lib/calendar";
import { formatLongDay } from "@/lib/format";
import { daysBetween } from "@/lib/lessons/stats";
import type { StudyCourse, StudyExam } from "@/lib/lessons/types";
import type { StudyPlanItem } from "@/lib/data/lessons";
import { createStudyPlan, deleteStudyPlan } from "@/lib/actions/lessons";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
const tag = (course: StudyCourse | undefined) => `var(--color-tag-${course?.color ?? "blue"})`;

/**
 * The period as Monday-first weeks: exam days filled in their course's colour,
 * planned items as coloured dots (or small named chips with "Show names"). Opens on this week; tap a day to plan it.
 */
export function PlanCalendar({
  periodId,
  startDate,
  endDate,
  todayKey,
  courses,
  exams,
  plans,
}: {
  periodId: string;
  startDate: string;
  endDate: string;
  todayKey: string;
  courses: StudyCourse[];
  exams: StudyExam[];
  plans: StudyPlanItem[];
}) {
  const [showEarlier, setShowEarlier] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [, startAdd] = useTransition();
  // The sheet closes on Add; the save finishes behind it and only speaks up when it fails.
  const add = (input: { date: string; courseId: string | null; note: string }) => {
    setOpenDay(null);
    setAddError(null);
    startAdd(async () => {
      const result = await createStudyPlan({ periodId, ...input });
      if (!result.ok) setAddError(result.error);
    });
  };
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const allWeeks = calendarWeeks(startDate, endDate);
  const thisWeek = allWeeks.findIndex((w) => w.at(-1)!.key >= todayKey);
  const hidden = showEarlier || thisWeek <= 0 ? 0 : thisWeek;
  const label = (p: StudyPlanItem) => (p.courseId ? courseById.get(p.courseId)?.name : null) ?? p.note ?? "";
  const weeks = allWeeks.slice(hidden);

  return (
    <section className="card flex flex-col gap-1">
      <div className="mb-1 flex items-center justify-between gap-2">
        {hidden > 0 || showEarlier ? (
          <button
            type="button"
            onClick={() => setShowEarlier(!showEarlier)}
            aria-expanded={showEarlier}
            className="btn btn-ghost inline-flex min-h-11 px-3 text-sm"
          >
            {showEarlier ? "Hide earlier weeks" : "Show earlier weeks"}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setShowNames(!showNames)}
          aria-pressed={showNames}
          className="btn btn-ghost inline-flex min-h-11 px-3 text-sm"
        >
          {showNames ? "Hide names" : "Show names"}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      {weeks.map((week, i) => {
        // A month heading above the week its 1st falls in (and above the first week shown).
        const first = week.find((d) => d.inRange && (d.key.endsWith("-01") || i === 0));
        return (
          <div key={week[0].key} className="flex flex-col gap-1">
            {first && <h3 className="section-title mt-2">{MONTH.format(new Date(`${first.key}T00:00:00Z`))}</h3>}
            <div className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                if (!day.inRange) return <span key={day.key} aria-hidden="true" />;
                const dayExams = exams.filter((e) => e.date === day.key);
                const dayPlans = plans.filter((p) => p.date === day.key);
                const examCourse = dayExams.length ? courseById.get(dayExams[0].courseId) : undefined;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setOpenDay(day.key)}
                    aria-label={`${formatLongDay(day.key)}${dayExams.length ? `, ${dayExams.length} exam` : ""}${dayPlans.length ? `, ${dayPlans.length} planned` : ""}`}
                    className={`tap flex aspect-square min-h-11 min-w-0 flex-col overflow-hidden rounded-lg text-center leading-none ${
                      showNames ? "items-stretch gap-0.5 p-0.5" : "items-center justify-center gap-1"
                    } ${
                      day.key === todayKey ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""
                    } ${day.key < todayKey ? "opacity-50" : ""} ${dayExams.length ? "font-semibold text-white" : "bg-surface-muted text-foreground"}`}
                    style={dayExams.length ? { backgroundColor: tag(examCourse) } : undefined}
                  >
                    <span className={`text-xs ${showNames ? "pt-1" : ""}`}>{Number(day.key.slice(8))}</span>
                    {dayExams.length > 0 && (
                      <>
                        {showNames && <span className="truncate text-[9px]">{examCourse?.name ?? "?"}</span>}
                        <span className={`uppercase ${showNames ? "text-[8px]" : "text-[9px]"}`}>{dayExams[0].kind}</span>
                      </>
                    )}
                    {!showNames
                      ? dayPlans.length > 0 && (
                          <span className="flex gap-0.5" aria-hidden="true">
                            {dayPlans.slice(0, 3).map((p) => (
                              <span
                                key={p.id}
                                // A white ring keeps a dot visible on an exam day of the same colour.
                                className={`h-1.5 w-1.5 rounded-full ${dayExams.length ? "ring-1 ring-white" : ""}`}
                                style={{ backgroundColor: p.courseId ? tag(courseById.get(p.courseId)) : "var(--color-ink-muted)" }}
                              />
                            ))}
                          </span>
                        )
                      : (() => {
                          // An exam day already spends two lines on the exam, so there's room for one chip.
                          const room = dayExams.length ? 1 : 2;
                          return (
                            <>
                              {dayPlans.slice(0, room).map((p) => (
                                <span
                                  key={p.id}
                                  className="truncate rounded px-0.5 py-px text-[9px] font-normal"
                                  style={{
                                    backgroundColor: dayExams.length
                                      ? "rgb(255 255 255 / 0.25)"
                                      : `color-mix(in oklab, ${p.courseId ? tag(courseById.get(p.courseId)) : "var(--color-ink-muted)"} 30%, transparent)`,
                                  }}
                                >
                                  {label(p)}
                                </span>
                              ))}
                              {dayPlans.length > room && (
                                <span className={`text-[9px] ${dayExams.length ? "" : "text-ink-muted"}`}>+{dayPlans.length - room}</span>
                              )}
                            </>
                          );
                        })()}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <Sheet open={openDay !== null} onOpenChange={(open) => !open && setOpenDay(null)} title={openDay ? formatLongDay(openDay) : ""}>
        {openDay && (
          <DayPlan
            key={openDay}
            onAdd={add}
            day={openDay}
            courses={courses}
            courseById={courseById}
            exams={exams}
            plans={plans.filter((p) => p.date === openDay)}
          />
        )}
      </Sheet>
      <UndoBar error={addError} />
    </section>
  );
}

/** Every exam still ahead: days left, and on how many of those days its course is planned. */
export function DaysLeft({
  todayKey,
  courses,
  exams,
  plans,
}: {
  todayKey: string;
  courses: StudyCourse[];
  exams: StudyExam[];
  plans: StudyPlanItem[];
}) {
  const ahead = exams.filter((e) => e.date >= todayKey);
  if (ahead.length === 0) return null;
  const courseById = new Map(courses.map((c) => [c.id, c]));
  return (
    <section className="card">
      <h2 className="font-medium text-foreground">Days left</h2>
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {ahead.map((exam) => {
          const course = courseById.get(exam.courseId);
          const days = daysBetween(todayKey, exam.date);
          const planned = new Set(
            plans.filter((p) => p.courseId === exam.courseId && p.date >= todayKey && p.date < exam.date).map((p) => p.date)
          ).size;
          return (
            <li key={exam.id} className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag(course) }} aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-foreground">
                    {course?.name ?? "?"} {exam.kind}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {formatLongDay(exam.date)} · {planned === 0 ? "nothing planned" : `${planned} ${planned === 1 ? "day" : "days"} planned`}
                  </span>
                </span>
              </span>
              <span
                className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${days <= 3 ? "text-critical" : "text-foreground"}`}
              >
                {days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DayPlan({
  onAdd,
  day,
  courses,
  courseById,
  exams,
  plans,
}: {
  onAdd: (input: { date: string; courseId: string | null; note: string }) => void;
  day: string;
  courses: StudyCourse[];
  courseById: Map<string, StudyCourse>;
  exams: StudyExam[];
  plans: StudyPlanItem[];
}) {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  };

  const todays = exams.filter((e) => e.date === day);
  const ahead = exams.filter((e) => e.date > day);

  return (
    <div className="flex flex-col gap-5">
      {(todays.length > 0 || ahead.length > 0) && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {todays.map((e) => (
            <li key={e.id} className="font-semibold text-critical">
              {courseById.get(e.courseId)?.name ?? "?"} {e.kind} today{e.note && <span className="font-normal text-ink-muted"> · {e.note}</span>}
            </li>
          ))}
          {ahead.slice(0, 3).map((e) => {
            const days = daysBetween(day, e.date);
            return (
              <li key={e.id} className="flex items-center gap-2 text-ink-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag(courseById.get(e.courseId)) }} aria-hidden="true" />
                <span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">{days === 1 ? "1 day" : `${days} days`}</span> before{" "}
                  {courseById.get(e.courseId)?.name ?? "?"} {e.kind}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="section-title">Planned</h3>
        {plans.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing planned yet.</p>
        ) : (
          <ul className="card-list">
            {plans.map((p) => {
              const course = p.courseId ? courseById.get(p.courseId) : undefined;
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-1">
                  {course && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag(course) }} aria-hidden="true" />}
                  <span className="min-w-0 flex-1 text-sm text-foreground">
                    {course?.name}
                    {course && p.note && " · "}
                    {p.note && <span className={course ? "text-ink-muted" : ""}>{p.note}</span>}
                  </span>
                  <ConfirmButton quiet disabled={isPending} onConfirm={() => run(() => deleteStudyPlan(p.id))} aria-label="Delete">
                    Delete
                  </ConfirmButton>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd({ date: day, courseId, note });
        }}
      >
        <h3 className="section-title">Add</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Course">
          {courses.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={courseId === c.id}
              onClick={() => setCourseId(courseId === c.id ? null : c.id)}
              className={`btn inline-flex min-h-11 items-center gap-2 px-3 text-sm ${courseId === c.id ? "btn-primary" : "btn-outline"}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag(c) }} aria-hidden="true" />
              {c.name}
            </button>
          ))}
        </div>
        <input
          className="field"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          placeholder="Note, e.g. chapters 4–5"
          aria-label="Note"
        />
        {error && (
          <p role="alert" className="text-sm text-critical">
            {error}
          </p>
        )}
        <button type="submit" disabled={isPending || (!courseId && !note.trim())} className="btn btn-primary min-h-11 px-4 font-semibold">
          Add to plan
        </button>
      </form>
    </div>
  );
}
