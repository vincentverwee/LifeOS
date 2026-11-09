"use client";

import type { ReactNode } from "react";

/**
 * The one floating "✓ Done · Undo" pill: fixed just above the tab bar, so it's in
 * view wherever the tap was. Errors show in the same spot. Render it always
 * (it's an aria-live region); it's empty while there's nothing to say.
 */
export function UndoBar({ message, onUndo, error }: { message?: ReactNode; onUndo?: () => void; error?: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-tabbar z-30 mx-auto flex max-w-md flex-col gap-2 px-4">
      {message && (
        <p className="pointer-events-auto flex animate-rise items-center justify-between gap-3 rounded-full border border-border bg-surface py-1 pr-1 pl-4 text-sm text-foreground shadow-lg">
          <span className="min-w-0 truncate">✓ {message}</span>
          {onUndo && (
            <button type="button" onClick={onUndo} className="btn btn-ghost inline-flex min-h-11 shrink-0 px-4 font-semibold">
              Undo
            </button>
          )}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="pointer-events-auto rounded-2xl border border-critical bg-surface px-4 py-3 text-sm text-critical shadow-lg"
        >
          {error}
        </p>
      )}
    </div>
  );
}
