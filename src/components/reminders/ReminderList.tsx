"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { completeReminder, undoCompleteReminder } from "@/lib/actions/reminders";
import { logRoutineToday, unlogRoutineToday } from "@/lib/actions/routines";
import { logMessageToday, unlogContact } from "@/lib/actions/people";
import type { PersonSummary } from "@/lib/data/people";
import { describeDue, describeRepeat, type Reminder } from "@/lib/reminders/schedule";
import { describeSince, isOverdue, type Routine } from "@/lib/reminders/routines";
import { SheepCheckbox } from "./SheepCheckbox";
import { SLIDE_OUT_MS, SlideRow, wait } from "./SlideRow";

type Undo = { key: string; title: string; label: string; run: () => Promise<void> };

/** One To do row: the sheep box, then the title (linking to its edit page) and a grey line under it. */
function TodoRow({
  done,
  returning,
  title,
  href,
  meta,
  onTick,
}: {
  done: boolean;
  returning: boolean;
  title: string;
  href: string;
  meta: React.ReactNode;
  onTick: () => void;
}) {
  return (
    <SlideRow leaving={done ? "right" : null} entering={returning}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pl-3">
        <SheepCheckbox checked={done} label={title} onChange={onTick} disabled={done} />
        <Link href={href} className="tap -my-1 min-w-0 flex-1 rounded-xl px-2 py-1">
          <p className={`leading-snug font-medium text-foreground ${done ? "line-through" : ""}`}>{title}</p>
          {meta && <p className="mt-0.5 text-sm text-ink-muted">{meta}</p>}
        </Link>
      </div>
    </SlideRow>
  );
}

/**
 * To do: open reminders, Last done items past their "every N days" and people to
 * catch up with ("Message Louise": ticking logs a message today), each with a sheep box.
 * Ticked rows slide off to the right; "Undo" stays for a few seconds.
 */
export function ReminderList({
  reminders,
  routines,
  catchUps,
  todayKey,
}: {
  reminders: Reminder[];
  routines: Routine[];
  catchUps: PersonSummary[];
  todayKey: string;
}) {
  // Ticked rows stay ticked until the action's re-render drops them from the list.
  const [ticked, addTicked] = useOptimistic<ReadonlySet<string>, string>(new Set(), (prev, key) => new Set(prev).add(key));
  const [undo, setUndo] = useState<Undo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // An undone row slides back in from the right when it reappears.
  const [returning, setReturning] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);

  function tickReminder(reminder: Reminder) {
    const key = `r-${reminder.id}`;
    setError(null);
    startTransition(async () => {
      addTicked(key);
      // Keep the row until it has slid away, even when the server is quicker.
      const [result] = await Promise.all([completeReminder(reminder.id), wait(SLIDE_OUT_MS)]);
      if (result.ok) {
        setUndo({
          key,
          title: reminder.title,
          label: reminder.repeat === "once" ? "Done" : "Done until next time",
          run: () => undoCompleteReminder(reminder.id, result.previousDueOn),
        });
      } else {
        setError(result.error);
      }
    });
  }

  function tickRoutine(routine: Routine) {
    const key = `l-${routine.id}`;
    setError(null);
    startTransition(async () => {
      addTicked(key);
      await Promise.all([logRoutineToday(routine.id), wait(SLIDE_OUT_MS)]);
      setUndo({ key, title: routine.name, label: "Done today", run: () => unlogRoutineToday(routine.id) });
    });
  }

  function tickCatchUp(person: PersonSummary) {
    const key = `p-${person.id}`;
    setError(null);
    startTransition(async () => {
      addTicked(key);
      const [result] = await Promise.all([logMessageToday(person.id), wait(SLIDE_OUT_MS)]);
      if (result.ok) {
        // Already logged elsewhere today: there's nothing of ours to undo.
        if (result.created) {
          setUndo({ key, title: person.name, label: "Messaged", run: () => unlogContact(person.id, result.day, "message") });
        }
      } else {
        setError(result.error);
      }
    });
  }

  function undoTick(target: Undo) {
    setUndo(null);
    setReturning(target.key);
    startTransition(target.run);
  }

  const empty = reminders.length === 0 && routines.length === 0 && catchUps.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {empty ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          Nothing to do. Enjoy the meadow.{" "}
          <Link href="/reminders/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Add a reminder
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col">
          {reminders.map((reminder) => {
            const key = `r-${reminder.id}`;
            const due = describeDue(reminder.dueOn, todayKey);
            const overdue = reminder.dueOn !== null && reminder.dueOn < todayKey;
            const repeat = describeRepeat(reminder, reminder.dueOn);
            return (
              <TodoRow
                key={key}
                done={ticked.has(key)}
                returning={returning === key}
                title={reminder.title}
                href={`/reminders/${reminder.id}`}
                onTick={() => tickReminder(reminder)}
                meta={
                  (due || repeat) && (
                    <>
                      {due && <span className={overdue ? "text-critical" : undefined}>{due}</span>}
                      {due && repeat && " · "}
                      {repeat}
                    </>
                  )
                }
              />
            );
          })}
          {routines.map((routine) => {
            const key = `l-${routine.id}`;
            return (
              <TodoRow
                key={key}
                done={ticked.has(key)}
                returning={returning === key}
                title={routine.name}
                href={`/reminders/last-done/${routine.id}`}
                onTick={() => tickRoutine(routine)}
                meta={
                  <>
                    <span className={isOverdue(routine, todayKey) ? "text-critical" : undefined}>
                      Last: {describeSince(routine.lastDoneOn, todayKey).toLowerCase()}
                    </span>
                    {` · every ${routine.everyDays} d`}
                  </>
                }
              />
            );
          })}
          {catchUps.map((person) => {
            const key = `p-${person.id}`;
            const nudge = { everyDays: person.seeEveryDays, lastDoneOn: person.lastContactOn };
            return (
              <TodoRow
                key={key}
                done={ticked.has(key)}
                returning={returning === key}
                title={`Message ${person.name}`}
                href={`/people/${person.id}`}
                onTick={() => tickCatchUp(person)}
                meta={
                  <>
                    <span className={isOverdue(nudge, todayKey) ? "text-critical" : undefined}>
                      Last in touch: {describeSince(person.lastContactOn, todayKey).toLowerCase()}
                    </span>
                    {` · every ${person.seeEveryDays} d`}
                  </>
                }
              />
            );
          })}
        </ul>
      )}

      <div aria-live="polite" className="min-h-11">
        {undo && (
          <p className="flex items-center justify-between gap-3 rounded-full bg-surface-muted py-1 pr-1 pl-4 text-sm text-foreground">
            <span className="min-w-0 truncate">
              ✓ {undo.label}: {undo.title}
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
