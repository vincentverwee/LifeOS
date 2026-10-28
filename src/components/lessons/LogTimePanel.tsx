"use client";

import { useState, useSyncExternalStore } from "react";
import type { StudyCourse, StudyTimerState } from "@/lib/lessons/types";
import { StudyEntryForm } from "@/components/lessons/StudyEntryForm";
import { StudyTimer } from "@/components/lessons/StudyTimer";

type Mode = "timer" | "hand";
const MODE_KEY = "lessons-log-mode";

function readStoredMode(): Mode | null {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return value === "timer" || value === "hand" ? value : null;
  } catch {
    return null;
  }
}

type LogTimePanelProps = {
  periodId: string;
  startDate: string;
  endDate: string;
  courses: StudyCourse[];
  timer: StudyTimerState | null;
};

/** Log time: a running timer, or hours typed by hand. Opens on the timer while one runs. */
export function LogTimePanel({ periodId, startDate, endDate, courses, timer }: LogTimePanelProps) {
  const stored = useSyncExternalStore(
    () => () => {},
    readStoredMode,
    () => null
  );
  const [picked, setPicked] = useState<Mode | null>(null);
  const mode: Mode = picked ?? (timer ? "timer" : (stored ?? "hand"));

  function choose(next: Mode) {
    setPicked(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // private mode: just not remembered
    }
  }

  const segment = (value: Mode, label: string) => (
    <button
      type="button"
      onClick={() => choose(value)}
      aria-pressed={mode === value}
      className={`btn flex min-h-11 flex-1 px-3 text-sm ${
        mode === value ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-full bg-surface-muted p-1">
        {segment("timer", timer ? "Timer · running" : "Timer")}
        {segment("hand", "By hand")}
      </div>
      {mode === "timer" ? (
        <StudyTimer periodId={periodId} courses={courses} timer={timer} />
      ) : (
        <StudyEntryForm periodId={periodId} startDate={startDate} endDate={endDate} courses={courses} />
      )}
    </div>
  );
}
