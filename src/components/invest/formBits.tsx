"use client";

import { useState, useTransition } from "react";

const FAILED = "Couldn't save that. Check your connection and try again.";

/** Runs a server action from a button, keeping its error (like Workouts' settings). */
export function useRun() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      try {
        const r = await fn();
        if (!r.ok) setError(r.error ?? FAILED);
      } catch {
        setError(FAILED);
      }
    });
  return { error, pending, run };
}

export function ErrorLine({ error }: { error: string | null | undefined }) {
  return error ? (
    <p role="alert" className="text-sm text-critical">
      {error}
    </p>
  ) : null;
}
