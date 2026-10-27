"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { completeReminder, undoCompleteReminder } from "@/lib/actions/reminders";
import { describeDue, describeRepeat, type Reminder } from "@/lib/reminders/schedule";
import { SheepCheckbox } from "./SheepCheckbox";
import { SLIDE_OUT_MS, SlideRow, wait } from "./SlideRow";

type Undo = { id: string; title: string; previousDueOn: string | null; next: string };

/** The open reminders, each with a sheep box. Ticked rows slide off to the right; "Undo" stays for a few seconds. */
export function ReminderList({ reminders, todayKey }: { reminders: Reminder[]; todayKey: string }) {
  // Ticked rows stay ticked until the action's re-render drops them from the list.
  const [ticked, addTicked] = useOptimistic<ReadonlySet<string>, string>(new Set(), (prev, id) => new Set(prev).add(id));
  const [undo, setUndo] = useState<Undo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // An undone reminder slides back in from the right when it reappears.
  const [returning, setReturning] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);

  function tick(reminder: Reminder) {
    setError(null);
    startTransition(async () => {
      addTicked(reminder.id);
      // Keep the row until it has slid away, even when the server is quicker.
      const [result] = await Promise.all([completeReminder(reminder.id), wait(SLIDE_OUT_MS)]);
      if (result.ok) {
        const next = reminder.repeat === "once" ? "Done" : "Done until next time";
        setUndo({ id: reminder.id, title: reminder.title, previousDueOn: result.previousDueOn, next });
      } else {
        setError(result.error);
      }
    });
  }

  function undoTick(target: Undo) {
    setUndo(null);
    setReturning(target.id);
    startTransition(() => undoCompleteReminder(target.id, target.previousDueOn));
  }

  return (
    <div className="flex flex-col gap-3">
      {reminders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          Nothing to do. Enjoy the meadow.{" "}
          <Link href="/reminders/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Add a reminder
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col">
          {reminders.map((reminder) => {
            const done = ticked.has(reminder.id);
            const due = describeDue(reminder.dueOn, todayKey);
            const overdue = reminder.dueOn !== null && reminder.dueOn < todayKey;
            const repeat = describeRepeat(reminder, reminder.dueOn);
            return (
              <SlideRow key={reminder.id} leaving={done ? "right" : null} entering={reminder.id === returning}>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pl-3">
                <SheepCheckbox checked={done} label={reminder.title} onChange={() => tick(reminder)} disabled={done} />
                <Link href={`/reminders/${reminder.id}`} className="tap -my-1 min-w-0 flex-1 rounded-xl px-2 py-1">
                  <p className={`leading-snug font-medium text-foreground ${done ? "line-through" : ""}`}>
                    {reminder.title}
                  </p>
                  {(due || repeat) && (
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {due && <span className={overdue ? "text-critical" : undefined}>{due}</span>}
                      {due && repeat && " · "}
                      {repeat}
                    </p>
                  )}
                </Link>
                </div>
              </SlideRow>
            );
          })}
        </ul>
      )}

      <div aria-live="polite" className="min-h-11">
        {undo && (
          <p className="flex items-center justify-between gap-3 rounded-full bg-surface-muted py-1 pr-1 pl-4 text-sm text-foreground">
            <span className="min-w-0 truncate">
              ✓ {undo.next}: {undo.title}
            </span>
            <button type="button" onClick={() => undoTick(undo)} className="btn btn-ghost inline-flex min-h-11 shrink-0 px-4">
              Undo
            </button>
          </p>
        )}
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </div>
  );
}
