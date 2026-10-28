"use client";

import { useState, useTransition } from "react";
import { discardStudyTimer, startStudyTimer, stopStudyTimer } from "@/lib/actions/lessons";
import type { StudyCourse, StudyTimerState } from "@/lib/lessons/types";
import {
  askTimerNotificationPermission,
  clearTimerNotification,
  showTimerNotification,
} from "@/lib/lessons/timerNotification";
import { CategoryChip } from "@/components/categories/CategoryChip";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { formatHours } from "@/lib/format";
import { formatElapsed, useNowSeconds } from "@/components/lessons/useNowSeconds";

type StudyTimerProps = {
  periodId: string;
  courses: StudyCourse[];
  timer: StudyTimerState | null;
};

const STICKY =
  "sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 -mx-4 bg-background/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none";

export function StudyTimer({ periodId, courses, timer }: StudyTimerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const now = useNowSeconds();

  function start() {
    setError(null);
    setSavedMessage(null);
    // Asked before any await: iOS only prompts inside the tap itself.
    const allowed = askTimerNotificationPermission();
    const codes = courses.filter((c) => selected.includes(c.id)).map((c) => c.code);
    startTransition(async () => {
      const result = await startStudyTimer({ periodId, courseIds: selected });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected([]);
      if (await allowed) await showTimerNotification(codes, new Date());
    });
  }

  function stop() {
    if (!timer) return;
    setError(null);
    const codes = timer.courses.map((c) => c.code);
    startTransition(async () => {
      const result = await stopStudyTimer();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await clearTimerNotification();
      setSavedMessage(
        `Saved ${formatHours(result.hours)}${codes.length ? ` · ${codes.join(", ")}` : ""}` +
          (result.movedTo ? ` · in ${result.movedTo}` : "")
      );
    });
  }

  function discard() {
    setError(null);
    startTransition(async () => {
      const result = await discardStudyTimer();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await clearTimerNotification();
    });
  }

  if (timer) {
    const started = new Date(timer.startedAt);
    const since = started.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const elapsed = now === null ? null : now - started.getTime() / 1000;
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-6">
          <span className="text-sm text-ink-muted">Studying since {since}</span>
          <span className="font-mono text-5xl font-semibold tabular-nums text-foreground" aria-live="off">
            {elapsed === null ? "–:––:––" : formatElapsed(elapsed)}
          </span>
          {timer.courses.length > 0 && (
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {timer.courses.map((c) => (
                <CategoryChip key={c.id} name={c.code} color={c.color} />
              ))}
            </div>
          )}
          {timer.courses.length > 1 && <span className="text-sm text-ink-muted">Hours split equally</span>}
        </div>

        {error && <p className="text-sm text-critical">{error}</p>}

        <button
          type="button"
          onClick={discard}
          disabled={pending}
          className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm"
        >
          Discard timer
        </button>

        <div className={STICKY}>
          <button
            type="button"
            onClick={stop}
            disabled={pending}
            className="btn btn-primary flex w-full px-4 py-3.5 text-base font-semibold shadow-md sm:shadow-none"
          >
            {pending ? (
              <span className="inline-flex items-center justify-center gap-2">
                <SheepSpinner size={20} />
                Saving…
              </span>
            ) : (
              `Stop & save${elapsed !== null && elapsed >= 60 ? ` ${formatElapsed(elapsed, false)}` : ""}`
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Courses{selected.length > 1 ? " — hours split equally" : ""}</span>
        {courses.length === 0 ? (
          <p className="text-sm text-ink-muted">No courses in this period yet — add them in Settings.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <CategoryChip
                key={c.id}
                name={c.code}
                color={c.color}
                selected={selected.includes(c.id)}
                onClick={() => {
                  setSavedMessage(null);
                  setSelected((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]));
                }}
                className="min-h-11"
              />
            ))}
          </div>
        )}
        <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
          {savedMessage ? (
            <span className="text-positive-text">✓ {savedMessage}</span>
          ) : (
            "Saved on the day you start, when you stop."
          )}
        </p>
      </div>

      {error && <p className="text-sm text-critical">{error}</p>}

      <div className={STICKY}>
        <button
          type="button"
          onClick={start}
          disabled={pending}
          className="btn btn-primary flex w-full px-4 py-3.5 text-base font-semibold shadow-md sm:shadow-none"
        >
          {pending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <SheepSpinner size={20} />
              Starting…
            </span>
          ) : (
            "Start timer"
          )}
        </button>
      </div>
    </div>
  );
}
