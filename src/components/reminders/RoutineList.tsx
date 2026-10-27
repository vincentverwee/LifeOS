"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { logRoutineToday, unlogRoutineToday } from "@/lib/actions/routines";
import { describeRhythm, describeSince, isDue, isOverdue, type Routine } from "@/lib/reminders/routines";
import { SheepCheckbox } from "./SheepCheckbox";

/**
 * Last done: how long ago each item was done. The sheep is ticked when it was done today;
 * tapping it logs today, tapping again takes today back off.
 */
export function RoutineList({ routines, todayKey }: { routines: Routine[]; todayKey: string }) {
  // id → done today, until the action's re-render brings the real state.
  const [toggled, setToggled] = useOptimistic<ReadonlyMap<string, boolean>, [string, boolean]>(
    new Map(),
    (prev, [id, done]) => new Map(prev).set(id, done)
  );
  const [, startTransition] = useTransition();

  function toggle(routine: Routine, doneToday: boolean) {
    startTransition(async () => {
      setToggled([routine.id, !doneToday]);
      await (doneToday ? unlogRoutineToday(routine.id) : logRoutineToday(routine.id));
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {routines.map((routine) => {
        const doneToday = toggled.get(routine.id) ?? routine.lastDoneOn === todayKey;
        // While a tap is on its way: today when just logged, the log before when today was just taken off.
        const lastDoneOn = doneToday
          ? todayKey
          : routine.lastDoneOn === todayKey
            ? (routine.recent[1] ?? null)
            : routine.lastDoneOn;
        const shown = { ...routine, lastDoneOn };
        const overdue = isOverdue(shown, todayKey);
        const dueToday = !overdue && isDue(shown, todayKey);
        const rhythm = describeRhythm(routine);
        return (
          <li key={routine.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pl-1">
            <Link href={`/reminders/last-done/${routine.id}`} className="tap -my-1 min-w-0 flex-1 rounded-xl px-3 py-1">
              <p className="truncate leading-snug font-medium text-foreground">{routine.name}</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                <span className={overdue ? "text-critical" : dueToday ? "text-warning-text" : undefined}>
                  {describeSince(shown.lastDoneOn, todayKey)}
                </span>
                {rhythm && ` · ${rhythm}`}
              </p>
            </Link>
            <SheepCheckbox checked={doneToday} label={`${routine.name} today`} onChange={() => toggle(routine, doneToday)} />
          </li>
        );
      })}
    </ul>
  );
}
