"use client";

import { useOptimistic, useTransition } from "react";
import { unwearToday, wearOutfit } from "@/lib/actions/wardrobe";

/** "Wore this today": logs the day and sends the clean pieces to the wash. Undo puts both back. */
export function WearButton({ outfitId, wornToday }: { outfitId: string; wornToday: boolean }) {
  const [pending, start] = useTransition();
  // Flips at once; the server's re-render confirms it (or puts it back on failure).
  const [worn, setWorn] = useOptimistic(wornToday);

  if (worn) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-3">
        <span className="text-foreground">
          ✓ Worn today <span className="text-sm text-ink-muted">· pieces in the wash</span>
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setWorn(false);
              await unwearToday(outfitId);
            })
          }
          className="btn btn-ghost inline-flex min-h-11 px-3 text-sm"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setWorn(true);
          await wearOutfit(outfitId);
        })
      }
      className="btn btn-primary flex min-h-12 w-full items-center justify-center gap-2 px-4 text-base font-semibold"
    >
      Wore this today
    </button>
  );
}
