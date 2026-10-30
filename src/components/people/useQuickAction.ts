"use client";

import { useState, useTransition } from "react";

const FAILED = "Couldn't save that. Check your connection and try again.";

/**
 * A one-tap server action (tick, delete, move) that shows its failure inline: an action that
 * throws (offline, server down) would otherwise swap the whole page for the error screen, and
 * one that returns `{ ok: false }` would fail silently.
 */
export function useQuickAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result && typeof result === "object" && "ok" in result && result.ok === false && "error" in result) {
          setError(String(result.error));
        }
      } catch {
        setError(FAILED);
      }
    });
  }

  return { pending, run, error };
}
