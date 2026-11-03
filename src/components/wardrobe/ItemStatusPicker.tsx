"use client";

import { useOptimistic, useTransition } from "react";
import { moveItems } from "@/lib/actions/wardrobe";
import { STATUSES, STATUS_LABEL, type ClothingStatus } from "@/lib/wardrobe/types";

/** Clean / In the wash / Drying as one segmented switch on an item's page. */
export function ItemStatusPicker({ id, status }: { id: string; status: ClothingStatus }) {
  const [shown, setShown] = useOptimistic(status);
  const [, start] = useTransition();

  return (
    <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1 rounded-full bg-surface-muted p-1">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={shown === s}
          onClick={() => {
            if (s === shown) return;
            start(async () => {
              setShown(s);
              await moveItems([id], shown, s);
            });
          }}
          className={`min-h-11 rounded-full px-2 text-sm font-medium ${shown === s ? "bg-surface text-foreground shadow-sm" : "text-ink-muted"}`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
