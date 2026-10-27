"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createReminder, updateReminder, type ReminderFormState } from "@/lib/actions/reminders";
import { describeRepeat, REPEATS, type Reminder, type Repeat } from "@/lib/reminders/schedule";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

const SEGMENT_LABELS: Record<Repeat, string> = { once: "Once", weekly: "Weekly", monthly: "Monthly" };

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
  const [date, setDate] = useState(reminder?.dueOn ?? "");

  const [state, formAction] = useActionState(async (prev: ReminderFormState, formData: FormData) => {
    if (reminder) return updateReminder(prev, formData);
    const result = await createReminder(prev, formData);
    if (result?.ok) {
      setTitle("");
      setRepeat("once");
      setDate("");
    }
    return result;
  }, null);

  function pickRepeat(next: Repeat) {
    setRepeat(next);
    if (next !== "once" && !date) setDate(todayKey);
  }

  const hint =
    repeat === "once"
      ? date
        ? "Shows up on that day and stays until you tick it."
        : "No date: it stays on the list until you tick it."
      : `${describeRepeat(repeat, date || todayKey, null)}, starting on that day.`;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {reminder && <input type="hidden" name="id" value={reminder.id} />}
      <input type="hidden" name="repeat" value={repeat} />

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">What</span>
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          enterKeyHint="done"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Pay rent, call grandma"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Repeat</span>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
          {REPEATS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => pickRepeat(r)}
              aria-pressed={repeat === r}
              className={`btn flex min-h-11 flex-1 px-3 text-sm ${
                repeat === r ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
              }`}
            >
              {SEGMENT_LABELS[r]}
            </button>
          ))}
        </div>
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
            onChange={(e) => setDate(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
          />
          {repeat === "once" && date && (
            <button type="button" onClick={() => setDate("")} className="btn btn-ghost inline-flex min-h-11 px-3 text-sm">
              No date
            </button>
          )}
        </div>
        <p className="text-sm text-ink-muted">{hint}</p>
      </div>

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
      {state?.ok && !reminder && <p className="text-sm text-positive-text">✓ Added</p>}

      <SubmitButton label={reminder ? "Save changes" : "Add reminder"} />
    </form>
  );
}
