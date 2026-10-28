"use client";

import Link from "next/link";
import type { StudyTimerState } from "@/lib/lessons/types";
import { formatElapsed, useNowSeconds } from "@/components/lessons/useNowSeconds";

/** "⏱ Studying FIN · 0:42", ticking. `card` is the tappable version on Lessons Today. */
export function RunningTimerBadge({ timer, card = false }: { timer: StudyTimerState; card?: boolean }) {
  const now = useNowSeconds();
  const elapsed = now === null ? null : now - new Date(timer.startedAt).getTime() / 1000;
  const names = timer.courses.map((c) => c.name).join(", ");
  const text = (
    <>
      <span aria-hidden="true">⏱ </span>
      Studying{names ? ` ${names}` : ""}
      <span className="font-mono tabular-nums"> · {elapsed === null ? "–:––" : formatElapsed(elapsed, false)}</span>
    </>
  );

  if (!card) return <p className="text-sm font-medium text-primary">{text}</p>;
  return (
    <Link
      href="/lessons/add"
      className="tap flex min-h-11 items-center justify-between gap-2 rounded-xl border border-primary bg-surface px-4 py-3 text-foreground"
    >
      <span className="font-medium">{text}</span>
      <span className="text-sm text-ink-muted">Stop ›</span>
    </Link>
  );
}
