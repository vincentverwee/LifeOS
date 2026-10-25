"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StudyCourse, StudyExam, StudyPeriod } from "@/lib/lessons/types";
import {
  createStudyCourse,
  createStudyExam,
  createStudyPeriod,
  deleteStudyCourse,
  deleteStudyExam,
  deleteStudyPeriod,
  updateStudyCourse,
  updateStudyPeriod,
  type LessonsResult,
} from "@/lib/actions/lessons";
import { CATEGORY_COLOR_SLOTS, type CategoryColorSlot } from "@/lib/categoryPalette";
import { formatDate, parseHours } from "@/lib/format";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

const input = "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground";
const label = "text-xs text-ink-muted";

/** Runs a server action, shows its error, refreshes the page on success. */
function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function run<R extends LessonsResult | { ok: true; id: string }>(
    action: () => Promise<R | { ok: false; error: string }>,
    onOk?: (result: R) => void
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      onOk?.(result as R);
      router.refresh();
    });
  }
  return { error, setError, isPending, run };
}

function SaveButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="btn btn-primary flex-1 px-4 py-3 text-sm font-semibold">
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SheepSpinner size={18} />
          Saving…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// --- Period ---

export function StudyPeriodForm({ period }: { period?: StudyPeriod }) {
  const router = useRouter();
  const { error, setError, isPending, run } = useAction();
  const [name, setName] = useState(period?.name ?? "");
  const [startDate, setStartDate] = useState(period?.startDate ?? "");
  const [blokStart, setBlokStart] = useState(period?.blokStart ?? "");
  const [endDate, setEndDate] = useState(period?.endDate ?? "");
  const [goal, setGoal] = useState(String(period?.goalHours ?? 7).replace(".", ","));
  const [topDay, setTopDay] = useState(String(period?.topDayHours ?? 8.5).replace(".", ","));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const goalHours = parseHours(goal);
    const topDayHours = parseHours(topDay);
    if (goalHours === null || topDayHours === null) return setError("Enter the goal and top day in hours.");
    const fields = { name, startDate, blokStart, endDate, goalHours, topDayHours };
    if (period) {
      run(() => updateStudyPeriod({ id: period.id, ...fields }));
    } else {
      run(
        () => createStudyPeriod(fields),
        (result) => router.push(`/lessons/settings?period=${encodeURIComponent(result.id)}`)
      );
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 flex flex-col gap-1">
          <span className={label}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Semester 3.2" className={input} />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={label}>Lessons start (Monday)</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={label}>Blok starts</span>
          <input type="date" value={blokStart} min={startDate || undefined} onChange={(e) => setBlokStart(e.target.value)} className={input} />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={label}>Last exam</span>
          <input type="date" value={endDate} min={blokStart || undefined} onChange={(e) => setEndDate(e.target.value)} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className={label}>Goal / day</span>
            <input inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} className={`${input} font-mono tabular-nums`} />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className={label}>Top day</span>
            <input inputMode="decimal" value={topDay} onChange={(e) => setTopDay(e.target.value)} className={`${input} font-mono tabular-nums`} />
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex">
        <SaveButton pending={isPending}>{period ? "Save period" : "Create period"}</SaveButton>
      </div>
    </form>
  );
}

export function DeletePeriodButton({ period }: { period: StudyPeriod }) {
  const router = useRouter();
  const { error, isPending, run } = useAction();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Delete ${period.name} with its ${period.entries.length} entries, courses and exams? This can't be undone.`)) return;
          run(
            () => deleteStudyPeriod(period.id),
            () => router.push("/lessons/settings")
          );
        }}
        className="btn btn-destructive self-start px-4 py-2.5 text-sm"
      >
        Delete period
      </button>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}

// --- Courses ---

function ColorPicker({ value, onChange }: { value: CategoryColorSlot; onChange: (c: CategoryColorSlot) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
      {CATEGORY_COLOR_SLOTS.map((slot) => (
        <button
          key={slot}
          type="button"
          role="radio"
          aria-checked={value === slot}
          aria-label={slot}
          onClick={() => onChange(slot)}
          className={`btn h-9 w-9 border-2 ${value === slot ? "border-foreground" : "border-transparent"}`}
        >
          <span className="h-5 w-5 rounded-full" style={{ backgroundColor: `var(--color-tag-${slot})` }} />
        </button>
      ))}
    </div>
  );
}

function CourseForm({
  course,
  periodId,
  nextColor,
  onDone,
}: {
  course?: StudyCourse;
  periodId: string;
  nextColor: CategoryColorSlot;
  onDone?: () => void;
}) {
  const { error, isPending, run } = useAction();
  const [code, setCode] = useState(course?.code ?? "");
  const [name, setName] = useState(course?.name ?? "");
  const [color, setColor] = useState<CategoryColorSlot>(course?.color ?? nextColor);
  const [hasWc, setHasWc] = useState(course?.hasWc ?? false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const fields = { code, name, color, hasWc };
    run(
      () => (course ? updateStudyCourse(course.id, fields) : createStudyCourse(periodId, fields)),
      () => {
        if (!course) {
          setCode("");
          setName("");
          setHasWc(false);
        }
        onDone?.();
      }
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className={label}>Code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DBT" className={input} />
        </label>
        <label className="col-span-2 flex min-w-0 flex-col gap-1">
          <span className={label}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Database Technologies" className={input} />
        </label>
      </div>
      <ColorPicker value={color} onChange={setColor} />
      <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={hasWc} onChange={(e) => setHasWc(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />
        Has WC (exercise sessions) next to HC
      </label>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex gap-2">
        <SaveButton pending={isPending}>{course ? "Save course" : "Add course"}</SaveButton>
        {onDone && course && (
          <button type="button" onClick={onDone} className="btn btn-outline px-5 py-3 text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function CourseManager({ period }: { period: StudyPeriod }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { error, isPending, run } = useAction();
  const used = new Set(period.courses.map((c) => c.color));
  const nextColor = CATEGORY_COLOR_SLOTS.find((s) => !used.has(s)) ?? CATEGORY_COLOR_SLOTS[0];

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-critical">{error}</p>}
      {period.courses.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {period.courses.map((course) => (
            <li key={course.id} className="border-b border-border p-3 last:border-b-0">
              {editingId === course.id ? (
                <CourseForm course={course} periodId={period.id} nextColor={nextColor} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-tag-${course.color})` }} aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{course.code}</span>
                    <span className="truncate text-xs text-ink-muted">
                      {course.name}
                      {course.hasWc ? " · HC + WC" : ""}
                    </span>
                  </span>
                  <button type="button" onClick={() => setEditingId(course.id)} className="btn btn-ghost min-h-11 px-4 text-sm">
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm(`Delete ${course.code}? Its logged hours stay, without a course; its exams and lesson marks go.`)) return;
                      run(() => deleteStudyCourse(course.id));
                    }}
                    className="btn min-h-11 px-4 text-sm text-critical hover:bg-critical/10 active:bg-critical/15"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">New course</h3>
        <CourseForm periodId={period.id} nextColor={nextColor} />
      </div>
    </div>
  );
}

// --- Exams ---

export function ExamManager({ period }: { period: StudyPeriod }) {
  const { error, setError, isPending, run } = useAction();
  const [courseId, setCourseId] = useState(period.courses[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<StudyExam["kind"]>("exam");
  const courseById = new Map(period.courses.map((c) => [c.id, c]));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!courseId) return setError("Pick a course.");
    run(
      () => createStudyExam({ courseId, date, kind, note: null }),
      () => setDate("")
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {period.exams.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {period.exams.map((exam) => {
            const course = courseById.get(exam.courseId);
            return (
              <li key={exam.id} className="flex items-center gap-2 border-b border-border p-3 last:border-b-0">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-tag-${course?.color ?? "blue"})` }} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-foreground">
                    {course?.code} {exam.kind}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDate(exam.date)}</span>
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => deleteStudyExam(exam.id))}
                  className="btn min-h-11 px-4 text-sm text-critical hover:bg-critical/10 active:bg-critical/15"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {period.courses.length > 0 && (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-foreground">New exam or test</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className={label}>Course</span>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={input}>
                {period.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className={label}>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            </label>
          </div>
          <div className="flex gap-1 rounded-full bg-surface-muted p-1">
            {(["exam", "test"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`btn flex-1 px-3 py-2 text-sm capitalize ${kind === k ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"}`}
              >
                {k}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
          <div className="flex">
            <SaveButton pending={isPending}>Add {kind}</SaveButton>
          </div>
        </form>
      )}
    </div>
  );
}
