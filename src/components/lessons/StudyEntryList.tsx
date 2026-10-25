"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StudyCourse, StudyEntry } from "@/lib/lessons/types";
import { deleteStudyEntry, updateStudyEntry } from "@/lib/actions/lessons";
import { Sheet } from "@/components/recipes/Sheet";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { formatHours, parseHours } from "@/lib/format";

const input = "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground";

const dayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

type StudyEntryListProps = {
  entries: StudyEntry[];
  courses: StudyCourse[];
  /** group rows under a date header per day (newest day first) */
  groupByDay?: boolean;
  empty?: string;
};

/** Tappable study entries; a tap opens an edit sheet. */
export function StudyEntryList({ entries, courses, groupByDay = false, empty = "Nothing logged yet." }: StudyEntryListProps) {
  const [editing, setEditing] = useState<StudyEntry | null>(null);
  const courseById = new Map(courses.map((c) => [c.id, c]));

  if (entries.length === 0) return <p className="px-4 pb-4 text-sm text-ink-muted">{empty}</p>;

  const days = new Map<string, StudyEntry[]>();
  for (const e of [...entries].reverse()) days.set(e.date, [...(days.get(e.date) ?? []), e]);

  const row = (e: StudyEntry) => {
    const course = e.courseId ? courseById.get(e.courseId) : undefined;
    return (
      <li key={e.id} className="border-t border-border first:border-t-0">
        <button
          type="button"
          onClick={() => setEditing(e)}
          className="tap flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: course ? `var(--color-tag-${course.color})` : "var(--color-gridline)" }}
              aria-hidden="true"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-foreground">{course?.code ?? (e.hours > 0 ? "No course" : "Day off")}</span>
              {e.note && <span className="truncate text-xs text-ink-muted">{e.note}</span>}
            </span>
          </span>
          <span className="font-mono text-sm font-medium tabular-nums text-foreground">{formatHours(e.hours)}</span>
        </button>
      </li>
    );
  };

  return (
    <>
      {groupByDay ? (
        <div className="flex flex-col gap-3">
          {[...days].map(([date, rows]) => (
            <section key={date} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-baseline justify-between bg-surface-muted px-4 py-2 text-sm">
                <span className="font-medium text-foreground">{dayFormatter.format(new Date(`${date}T00:00:00Z`))}</span>
                <span className="font-mono tabular-nums text-ink-muted">
                  {formatHours(Math.round(rows.reduce((s, r) => s + r.hours, 0) * 100) / 100)}
                </span>
              </div>
              <ul>{rows.map(row)}</ul>
            </section>
          ))}
        </div>
      ) : (
        <ul>{[...entries].reverse().map(row)}</ul>
      )}
      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title="Edit study time">
        {editing && <EditEntryForm key={editing.id} entry={editing} courses={courses} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function EditEntryForm({ entry, courses, onDone }: { entry: StudyEntry; courses: StudyCourse[]; onDone: () => void }) {
  const router = useRouter();
  const [hours, setHours] = useState(String(entry.hours).replace(".", ","));
  const [courseId, setCourseId] = useState(entry.courseId ?? "");
  const [date, setDate] = useState(entry.date);
  const [note, setNote] = useState(entry.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    const parsed = parseHours(hours);
    if (parsed === null) return setError("Enter a time, e.g. 1,5 or 1:30.");
    setError(null);
    startTransition(async () => {
      const result = await updateStudyEntry({ id: entry.id, hours: parsed, courseId: courseId || null, date, note });
      if (!result.ok) return setError(result.error);
      onDone();
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteStudyEntry(entry.id);
      if (!result.ok) return setError(result.error);
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-ink-muted">Hours</span>
          <input
            type="text"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className={`${input} font-mono tabular-nums`}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-ink-muted">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Course</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={input}>
            <option value="">No course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Note</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </label>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="btn btn-primary flex-1 px-4 py-3 text-sm font-semibold"
        >
          {isPending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <SheepSpinner size={18} />
              Saving…
            </span>
          ) : (
            "Save"
          )}
        </button>
        <button type="button" onClick={remove} disabled={isPending} className="btn btn-destructive px-5 py-3 text-sm">
          Delete
        </button>
      </div>
    </div>
  );
}
