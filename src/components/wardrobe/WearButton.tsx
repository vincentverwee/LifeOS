"use client";

import { useOptimistic, useTransition } from "react";
import { unwearItemToday, unwearToday, wearItem, wearOutfit } from "@/lib/actions/wardrobe";

/**
 * "Wore this today" for an outfit (sends its clean pieces to the wash) or for one item
 * (sends it to the wash if clean). Undo puts both back. `wornInOutfit` (items only): it
 * was already worn today as part of an outfit, which is undone on that outfit's page.
 */
export function WearButton({
  outfitId,
  itemId,
  wornToday,
  wornInOutfit = false,
}: {
  wornToday: boolean;
  wornInOutfit?: boolean;
} & ({ outfitId: string; itemId?: never } | { itemId: string; outfitId?: never })) {
  const [pending, start] = useTransition();
  // Flips at once; the server's re-render confirms it (or puts it back on failure).
  const [worn, setWorn] = useOptimistic(wornToday);
  const wear = () => (outfitId ? wearOutfit(outfitId) : wearItem(itemId!));
  const undo = () => (outfitId ? unwearToday(outfitId) : unwearItemToday(itemId!));

  if (!worn && wornInOutfit) {
    return (
      <div className="flex min-h-12 items-center rounded-2xl bg-surface-muted px-4 py-3 text-foreground">
        ✓ Worn today <span className="ml-1 text-sm text-ink-muted">· in an outfit</span>
      </div>
    );
  }

  if (worn) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-3">
        <span className="text-foreground">
          ✓ Worn today
          {/* An item's own status shows right below, and it may have been drying, not clean. */}
          {outfitId && <span className="text-sm text-ink-muted"> · pieces in the wash</span>}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setWorn(false);
              await undo();
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
          await wear();
        })
      }
      className="btn btn-primary flex min-h-12 w-full items-center justify-center gap-2 px-4 text-base font-semibold"
    >
      Wore this today
    </button>
  );
}
