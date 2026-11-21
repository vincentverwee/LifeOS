"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/recipes/Sheet";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
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
 * planned courses as dots. Opens on this week; tap a day to plan it.
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
  const [openDay, setOpenDay] = useState<string | null>(null);
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const allWeeks = calendarWeeks(startDate, endDate);
  const thisWeek = allWeeks.findIndex((w) => w.at(-1)!.key >= todayKey);
  const hidden = showEarlier || thisWeek <= 0 ? 0 : thisWeek;
  const weeks = allWeeks.slice(hidden);

  return (
    <section className="card flex flex-col gap-1">
      {hidden > 0 && (
        <button type="button" onClick={() => setShowEarlier(true)} className="btn btn-ghost mb-1 inline-flex min-h-11 self-start px-3 text-sm">
          Show earlier weeks
        </button>
      )}
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
                    className={`tap flex aspect-square min-h-11 flex-col items-center justify-center gap-1 rounded-lg leading-none ${
                      day.key === todayKey ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""
                    } ${day.key < todayKey ? "opacity-50" : ""} ${dayExams.length ? "font-semibold text-white" : "bg-surface-muted text-foreground"}`}
                    style={dayExams.length ? { backgroundColor: tag(examCourse) } : undefined}
                  >
                    <span className="text-xs">{Number(day.key.slice(8))}</span>
                    {dayExams.length > 0 ? (
                      <span className="text-[9px] uppercase">{dayExams[0].kind}</span>
                    ) : (
                      dayPlans.length > 0 && (
                        <span className="flex gap-0.5" aria-hidden="true">
                          {dayPlans.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: p.courseId ? tag(courseById.get(p.courseId)) : "var(--color-ink-muted)" }}
                            />
                          ))}
                        </span>
                      )
                    )}
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
            periodId={periodId}
            day={openDay}
            courses={courses}
            courseById={courseById}
            exams={exams}
            plans={plans.filter((p) => p.date === openDay)}
          />
        )}
      </Sheet>
    </section>
  );
}

function DayPlan({
  periodId,
  day,
  courses,
  courseById,
  exams,
  plans,
}: {
  periodId: string;
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

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, onOk?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      onOk?.();
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
          run(
            () => createStudyPlan({ periodId, date: day, courseId, note }),
            () => {
              setCourseId(null);
              setNote("");
            }
          );
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
