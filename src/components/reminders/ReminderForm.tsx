"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createReminder, updateReminder, type ReminderFormState } from "@/lib/actions/reminders";
import { describeRepeat, weekdayName, weekdayOf, WEEKDAYS, type Reminder, type Repeat } from "@/lib/reminders/schedule";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

const REPEAT_OPTIONS: { value: Exclude<Repeat, "once">; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
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

/** Add (no `reminder`) or edit a reminder. `todayKey` is the start date a repeating one defaults to. */
export function ReminderForm({ reminder, todayKey }: { reminder?: Reminder; todayKey: string }) {
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [repeat, setRepeat] = useState<Repeat>(reminder?.repeat ?? "once");
  const [weekdays, setWeekdays] = useState<number[]>(reminder?.weekdays ?? []);
  const [date, setDate] = useState(reminder?.dueOn ?? "");
  // Set when picking a repeat filled in today; toggling the repeat off clears it again.
  const [autoDate, setAutoDate] = useState(false);
  const [showAdded, setShowAdded] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Desktop: straight into the title when adding; phones keep the keyboard closed.
  useEffect(() => {
    if (!reminder && window.matchMedia("(min-width: 640px)").matches) titleRef.current?.focus();
  }, [reminder]);

  const [state, formAction] = useActionState(async (prev: ReminderFormState, formData: FormData) => {
    if (reminder) return updateReminder(prev, formData);
    const result = await createReminder(prev, formData);
    if (result?.ok) {
      setTitle("");
      setRepeat("once");
      setWeekdays([]);
      setDate("");
      setAutoDate(false);
    }
    setShowAdded(!!result?.ok);
    return result;
  }, null);

  /** Tapping the selected option again turns repeating off. */
  function pickRepeat(next: Exclude<Repeat, "once">) {
    if (repeat === next) {
      setRepeat("once");
      if (autoDate) {
        setDate("");
        setAutoDate(false);
      }
      return;
    }
    setRepeat(next);
    const start = date || todayKey;
    if (!date) {
      setDate(todayKey);
      setAutoDate(true);
    }
    if (next === "weekly" && weekdays.length === 0) setWeekdays([weekdayOf(start)]);
  }

  function toggleDay(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  const start = date || todayKey;
  const hint =
    repeat === "once"
      ? date
        ? "Doesn't repeat. Shows up on that day and stays until you tick it."
        : "Doesn't repeat. No date: it stays on the list until you tick it."
      : repeat === "weekly" && weekdays.length === 0
        ? "Pick at least one day."
        : `${describeRepeat({ repeat, anchorDay: null, weekdays }, start)}, starting ${repeat === "weekly" ? "from" : "on"} that day.`;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {reminder && <input type="hidden" name="id" value={reminder.id} />}
      <input type="hidden" name="repeat" value={repeat} />
      {repeat === "weekly" && weekdays.map((d) => <input key={d} type="hidden" name="weekday" value={d} />)}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">What</span>
        <input
          ref={titleRef}
          name="title"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          enterKeyHint="done"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setShowAdded(false);
          }}
          placeholder="e.g. Pay rent, call grandma"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Repeat</span>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
          {REPEAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => pickRepeat(option.value)}
              aria-pressed={repeat === option.value}
              className={`btn flex min-h-11 flex-1 px-3 text-sm ${
                repeat === option.value ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {repeat === "weekly" && (
          <div role="group" aria-label="Days of the week" className="flex gap-1">
            {WEEKDAYS.map((day) => {
              const on = weekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={on}
                  aria-label={weekdayName(day, "long")}
                  className={`btn flex min-h-11 min-w-0 flex-1 px-0 text-sm ${on ? "btn-primary" : "btn-outline"}`}
                >
                  {weekdayName(day).slice(0, 2)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reminder-date" className="text-sm text-ink-muted">
          {repeat === "once" ? "Date (optional)" : "Starts on"}
        </label>
        <div className="flex gap-2">
          <input
            id="reminder-date"
            name="dueOn"
            type="date"
            required={repeat !== "once"}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setAutoDate(false);
            }}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
          />
          {repeat === "once" && date && (
            <button
              type="button"
              onClick={() => {
                setDate("");
                setAutoDate(false);
              }}
              className="btn btn-ghost inline-flex min-h-11 px-3 text-sm"
            >
              No date
            </button>
          )}
        </div>
        <p className="text-sm text-ink-muted">{hint}</p>
      </div>

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
      {showAdded && !reminder && <p className="text-sm text-positive-text">✓ Added. Add another or go back to the list.</p>}

      <SubmitButton label={reminder ? "Save changes" : "Add reminder"} />
    </form>
  );
}
