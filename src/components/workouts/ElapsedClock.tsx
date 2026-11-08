"use client";

import { formatElapsed, useNowSeconds } from "@/components/lessons/useNowSeconds";

/** Time since `since`, ticking: "0:42" under an hour (m:ss), else "1:05:09". */
export function ElapsedClock({ since }: { since: string }) {
  const now = useNowSeconds();
  if (now === null) return <>–:––</>;
  const s = Math.max(0, now - Math.floor(new Date(since).getTime() / 1000));
  if (s < 3600) return <>{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}</>;
  return <>{formatElapsed(s)}</>;
}
