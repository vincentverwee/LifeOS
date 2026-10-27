"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { completeReminder, undoCompleteReminder } from "@/lib/actions/reminders";
import { describeDue, describeRepeat, type Reminder } from "@/lib/reminders/schedule";
import { SheepCheckbox } from "./SheepCheckbox";

type Undo = { id: string; title: string; previousDueOn: string | null; next: string };

/** The open reminders, each with a sheep box. Ticked rows fade out; "Undo" stays for a few seconds. */
export function ReminderList({ reminders, todayKey }: { reminders: Reminder[]; todayKey: string }) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [undo, setUndo] = useState<Undo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);

  function tick(reminder: Reminder) {
    setError(null);
    setTicked((prev) => new Set(prev).add(reminder.id));
    startTransition(async () => {
      const result = await completeReminder(reminder.id);
      if (result.ok) {
        const next = reminder.repeat === "once" ? "Done" : "Done until next time";
        setUndo({ id: reminder.id, title: reminder.title, previousDueOn: result.previousDueOn, next });
      } else {
        setError(result.error);
      }
      setTicked((prev) => {
        const rest = new Set(prev);
        rest.delete(reminder.id);
        return rest;
      });
    });
  }

  function undoTick(target: Undo) {
    setUndo(null);
    startTransition(() => undoCompleteReminder(target.id, target.previousDueOn));
  }

  return (
    <div className="flex flex-col gap-3">
      {reminders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          Nothing to do. Enjoy the meadow.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reminders.map((reminder) => {
            const done = ticked.has(reminder.id);
            const due = describeDue(reminder.dueOn, todayKey);
            const overdue = reminder.dueOn !== null && reminder.dueOn < todayKey;
            const repeat = describeRepeat(reminder.repeat, reminder.dueOn, reminder.anchorDay);
            return (
              <li
                key={reminder.id}
                className={`flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pl-3 transition-opacity duration-300 motion-reduce:transition-none ${
                  done ? "opacity-50" : ""
                }`}
              >
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
              </li>
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
