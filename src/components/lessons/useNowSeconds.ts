"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

// Whole seconds, so the snapshot stays equal between reads within one tick.
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** The current time in whole seconds, ticking every second; null on the server. */
export function useNowSeconds(): number | null {
  return useSyncExternalStore(subscribe, nowSeconds, () => null);
}

/** "1:05:09", or "1:05" without seconds (hours:minutes). */
export function formatElapsed(totalSeconds: number, withSeconds = true): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const mm = String(m).padStart(2, "0");
  return withSeconds ? `${h}:${mm}:${String(s % 60).padStart(2, "0")}` : `${h}:${mm}`;
}
