"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { createStudyEntriesFromForm, type StudyEntryFormState } from "@/lib/actions/lessons";
import type { StudyCourse } from "@/lib/lessons/types";
import { CategoryChip } from "@/components/categories/CategoryChip";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { formatDate, formatHours, parseHours, toDateInputValue } from "@/lib/format";

type StudyEntryFormProps = {
  periodId: string;
  startDate: string;
  endDate: string;
  courses: StudyCourse[];
};

type DateChoice = "today" | "yesterday" | "other";

const QUICK_HOURS = ["0,5", "1", "2", "3"];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary flex w-full px-4 py-3.5 text-base font-semibold shadow-md sm:shadow-none"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SheepSpinner size={20} />
          Saving…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

function shiftDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return toDateInputValue(new Date(y, m - 1, d + days));
}

export function StudyEntryForm({ periodId, startDate, endDate, courses }: StudyEntryFormProps) {
  const [hours, setHours] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [otherDate, setOtherDate] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const hoursRef = useRef<HTMLInputElement>(null);

  // Local "today" is read in the browser only, like the expense form.
  const today = useSyncExternalStore(
    () => () => {},
    () => toDateInputValue(),
    () => ""
  );
  // Between periods (or viewing an old one) today can fall outside this period:
  // "Other" then starts on the period's last day instead of an out-of-range date.
  const notStarted = !!today && today < startDate;
  const lastDay = notStarted ? startDate : today && today < endDate ? today : endDate;
  const todayInPeriod = !!today && today >= startDate && today <= endDate;
  const date =
    dateChoice === "today"
      ? today
      : dateChoice === "yesterday"
        ? today && shiftDays(today, -1)
        : (otherDate ?? (todayInPeriod ? today : lastDay));

  const [state, formAction] = useActionState(async (prev: StudyEntryFormState, formData: FormData) => {
    const result = await createStudyEntriesFromForm(prev, formData);
    if (result?.ok) {
      const names = courses.filter((c) => selected.includes(c.id)).map((c) => c.name);
      setSavedMessage(
        `Saved ${formatHours(result.hours)}${names.length ? ` · ${names.join(", ")}` : ""}` +
          (result.movedTo ? ` · in ${result.movedTo}` : "")
      );
      setHours("");
      setNote("");
      setShowNote(false);
      setSelected([]);
    } else {
      setSavedMessage(null);
    }
    return result;
  }, null);

  // Desktop: jump straight into the hours field; phones keep the keyboard closed.
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) hoursRef.current?.focus();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const parsed = parseHours(hours);
  const isSum = /[+:mhu]/i.test(hours);
  const perCourse = parsed !== null && selected.length > 1 ? Math.round((parsed / selected.length) * 100) / 100 : null;

  const segment = (choice: DateChoice, label: string) => (
    <button
      type="button"
      onClick={() => setDateChoice(choice)}
      aria-pressed={dateChoice === choice}
      className={`btn flex min-h-11 flex-1 px-3 text-sm ${
        dateChoice === choice ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="periodId" value={periodId} />
      <input type="hidden" name="date" value={date} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="courseId" value={id} />
      ))}

      <div className="flex flex-col gap-1">
        <label htmlFor="hours" className="text-sm text-ink-muted">
          Hours studied
        </label>
        <input
          id="hours"
          ref={hoursRef}
          name="hours"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={hours}
          onChange={(e) => {
            setHours(e.target.value);
            setSavedMessage(null);
          }}
          placeholder="0"
          required
          className="rounded-2xl border border-border bg-surface px-4 py-3 font-mono text-3xl font-semibold tabular-nums text-foreground"
        />
        <div className="mt-1 flex gap-2">
          {QUICK_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => {
                setHours((prev) => (prev.trim() ? `${prev.trim()}+${h}` : h));
                setSavedMessage(null);
              }}
              className="btn btn-outline min-h-11 flex-1 px-2 font-mono text-sm tabular-nums"
            >
              +{h}
            </button>
          ))}
        </div>
        <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
          {savedMessage ? (
            <span className="text-positive-text">✓ {savedMessage}</span>
          ) : parsed !== null && (isSum || perCourse !== null) ? (
            `= ${formatHours(parsed)}${perCourse !== null ? ` · ${formatHours(perCourse)} per course` : ""}`
          ) : (
            "1,5 · 1:30 · 90m all work."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Courses{selected.length > 1 ? " — hours split equally" : ""}</span>
        {courses.length === 0 ? (
          <p className="text-sm text-ink-muted">No courses in this period yet — add them in Settings.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <CategoryChip
                key={c.id}
                name={c.name}
                color={c.color}
                selected={selected.includes(c.id)}
                onClick={() => toggle(c.id)}
                className="min-h-11"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Date</span>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
          {segment("today", "Today")}
          {segment("yesterday", "Yesterday")}
          {segment("other", dateChoice === "other" && date ? formatDate(date) : "Other…")}
        </div>
        {today && !todayInPeriod && dateChoice !== "other" && (
          <p className="text-sm text-warning-text">
            {notStarted
              ? `This period starts on ${formatDate(startDate)}.`
              : "Today is outside this period; it goes to whichever period covers it."}
          </p>
        )}
        {dateChoice === "other" && (
          <input
            type="date"
            value={date}
            min={startDate}
            max={lastDay}
            onChange={(e) => setOtherDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
          />
        )}
      </div>

      {showNote ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Note</span>
          <input
            name="note"
            type="text"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. library, or why it was a day off"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm"
        >
          + Add note
        </button>
      )}

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      {/* Sticky on phones so it stays reachable above the tab bar; the backing strip keeps
          fields scrolling underneath from showing around the button. */}
      <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 -mx-4 bg-background/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <SubmitButton label={parsed !== null && parsed > 0 ? `Save ${formatHours(parsed)}` : "Save study time"} />
      </div>
    </form>
  );
}
