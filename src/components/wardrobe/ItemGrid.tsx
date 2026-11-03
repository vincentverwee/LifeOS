"use client";

import Link from "next/link";
import { useState } from "react";
import { KINDS, STATUS_LABEL, type ClothingKind, type ClothingStatus } from "@/lib/wardrobe/types";
import { ItemPhoto } from "./ItemPhoto";

type Item = { id: string; name: string; kind: ClothingKind; color: string | null; status: ClothingStatus; photoId: string | null };

const CHIP = "btn inline-flex min-h-11 shrink-0 px-4 text-sm";

/** Every item as photo tiles, filtered by type chips. Not-clean items carry a small badge. */
export function ItemGrid({ items }: { items: Item[] }) {
  const [kind, setKind] = useState<ClothingKind | "all">("all");
  const kinds = KINDS.filter((k) => items.some((i) => i.kind === k.id));
  const shown = kind === "all" ? items : items.filter((i) => i.kind === kind);

  return (
    <div className="flex flex-col gap-4">
      {kinds.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button type="button" onClick={() => setKind("all")} className={`${CHIP} ${kind === "all" ? "btn-primary" : "btn-outline"}`}>
            All
          </button>
          {kinds.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`${CHIP} ${kind === k.id ? "btn-primary" : "btn-outline"}`}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((item) => (
          <li key={item.id}>
            <Link href={`/wardrobe/items/${item.id}`} className="tap block overflow-hidden rounded-2xl border border-border bg-surface hover:border-primary">
              <div className="relative">
                <ItemPhoto photoId={item.photoId} name={item.name} className="aspect-square w-full" />
                {item.status !== "clean" && (
                  <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium text-foreground">
                    {STATUS_LABEL[item.status]}
                  </span>
                )}
              </div>
              <div className="px-3 py-2">
                <p className="truncate font-medium text-foreground">{item.name}</p>
                {item.color && <p className="truncate text-sm text-ink-muted">{item.color}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
