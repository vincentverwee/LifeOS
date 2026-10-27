"use client";

import { useOptimistic, useTransition } from "react";
import { restoreReminder } from "@/lib/actions/reminders";
import type { FinishedReminder } from "@/lib/data/reminders";
import { describeDoneOn } from "@/lib/reminders/schedule";
import { SheepCheckbox } from "./SheepCheckbox";
import { SLIDE_OUT_MS, SlideRow, wait } from "./SlideRow";

/** Finished one-offs; tapping the ticked sheep puts one back on the list (it slides off to the left). */
export function FinishedList({ reminders, todayKey }: { reminders: FinishedReminder[]; todayKey: string }) {
  const [restoring, addRestoring] = useOptimistic<ReadonlySet<string>, string>(new Set(), (prev, id) => new Set(prev).add(id));
  const [, startTransition] = useTransition();

  function restore(id: string) {
    startTransition(async () => {
      addRestoring(id);
      await Promise.all([restoreReminder(id), wait(SLIDE_OUT_MS)]);
    });
  }

  return (
    <ul className="mt-3 flex flex-col">
      {reminders.map((reminder) => {
        const leaving = restoring.has(reminder.id);
        return (
          <SlideRow key={reminder.id} leaving={leaving ? "left" : null}>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pl-3">
              <SheepCheckbox
                checked={!leaving}
                label={reminder.title}
                onChange={() => restore(reminder.id)}
                disabled={leaving}
              />
              <div className="min-w-0 flex-1 px-2">
                <p className={`truncate text-ink-muted ${leaving ? "" : "line-through"}`}>{reminder.title}</p>
                <p className="text-sm text-ink-muted">Done {describeDoneOn(reminder.doneOn, todayKey)}</p>
              </div>
            </div>
          </SlideRow>
        );
      })}
    </ul>
  );
}
