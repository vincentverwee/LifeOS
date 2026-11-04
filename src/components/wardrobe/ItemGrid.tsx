"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUS_LABEL, type Category, type ClothingStatus, type WashGroup } from "@/lib/wardrobe/types";
import { groupByCategory } from "@/lib/wardrobe/logic";
import { ItemPhoto } from "./ItemPhoto";

type Item = {
  id: string;
  name: string;
  categoryId: string | null;
  washGroup: WashGroup;
  status: ClothingStatus;
  photoId: string | null;
  photoCutout: boolean;
};

const CHIP = "btn inline-flex min-h-11 shrink-0 px-4 text-sm";

/** Every item as photo tiles, filtered by category chips (only categories that have items). */
export function ItemGrid({ items, categories }: { items: Item[]; categories: Category[] }) {
  // "all", a category id, or "none" for items without one.
  const [filter, setFilter] = useState<string>("all");
  const groups = groupByCategory(items, categories);
  const shown =
    filter === "all" ? items : (groups.find((g) => (g.id ?? "none") === filter)?.items ?? items);

  return (
    <div className="flex flex-col gap-4">
      {groups.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button type="button" onClick={() => setFilter("all")} className={`${CHIP} ${filter === "all" ? "btn-primary" : "btn-outline"}`}>
            All
          </button>
          {groups.map((g) => {
            const key = g.id ?? "none";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`${CHIP} ${filter === key ? "btn-primary" : "btn-outline"}`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((item) => (
          <li key={item.id}>
            <Link href={`/wardrobe/items/${item.id}`} className="tap block overflow-hidden rounded-2xl border border-border bg-surface hover:border-primary">
              <div className="relative">
                <ItemPhoto photoId={item.photoId} cutout={item.photoCutout} name={item.name} className="aspect-square w-full" />
                {item.status !== "clean" && (
                  <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium text-foreground">
                    {STATUS_LABEL[item.status]}
                  </span>
                )}
              </div>
              <div className="px-3 py-2">
                <p className="truncate font-medium text-foreground">{item.name}</p>
                {/* Coloured is the usual case; only the white wash is worth a line. */}
                {item.washGroup === "white" && <p className="truncate text-sm text-ink-muted">White wash</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
