"use client";

import { useOptimistic, useTransition } from "react";
import {
  setWornInWash,
  setWornItemInWash,
  unwearItemToday,
  unwearToday,
  wearItem,
  wearOutfit,
} from "@/lib/actions/wardrobe";
import type { ClothingStatus, WashGroup } from "@/lib/wardrobe/types";
import { SheepCheckbox } from "@/components/reminders/SheepCheckbox";
import { ItemPhoto } from "./ItemPhoto";

export type WornPiece = {
  id: string;
  name: string;
  washGroup: WashGroup;
  status: ClothingStatus;
  photoId: string | null;
  photoCutout: boolean;
};

type Props = {
  wornToday: boolean;
} & (
  | {
      outfitId: string;
      /** The outfit's pieces, and which ones today's "Into the wash?" put in the basket. */
      pieces: WornPiece[];
      movedIds: string[];
      itemId?: never;
    }
  | {
      itemId: string;
      status: ClothingStatus;
      /** Today's own wear put it in the basket. */
      inWashFromToday: boolean;
      /** It was already worn today as part of an outfit, which is undone on that outfit's page. */
      wornInOutfit?: boolean;
      outfitId?: never;
    }
);

/**
 * "Wore this today" for an outfit or one item. Wearing only logs the day; then "Into the
 * wash?" lets you put pieces in the basket one by one (the rest stay clean). Undo takes the
 * day off and puts back what was put in from here.
 */
export function WearButton(props: Props) {
  const outfit = props.outfitId !== undefined ? props : null;
  const item = props.outfitId === undefined ? props : null;
  const [pending, start] = useTransition();
  // Flips at once; the server's re-render confirms it (or puts it back on failure).
  const [worn, setWorn] = useOptimistic(props.wornToday);
  // id → in the basket, until the re-render brings the real state.
  const [ticked, setTicked] = useOptimistic<ReadonlyMap<string, boolean>, [string[], boolean]>(
    new Map(),
    (prev, [ids, inWash]) => {
      const next = new Map(prev);
      for (const id of ids) next.set(id, inWash);
      return next;
    },
  );
  const wear = () => (outfit ? wearOutfit(outfit.outfitId) : wearItem(item!.itemId));
  const undo = () => (outfit ? unwearToday(outfit.outfitId) : unwearItemToday(item!.itemId));

  function toggle(ids: string[], inWash: boolean) {
    start(async () => {
      setTicked([ids, inWash]);
      await (outfit ? setWornInWash(outfit.outfitId, ids, inWash) : setWornItemInWash(item!.itemId, inWash));
    });
  }

  if (!worn && item?.wornInOutfit) {
    return (
      <div className="flex min-h-12 items-center rounded-2xl bg-surface-muted px-4 py-3 text-foreground">
        ✓ Worn today <span className="ml-1 text-sm text-ink-muted">· in an outfit</span>
      </div>
    );
  }

  if (!worn) {
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

  // The pieces that can still be ticked: clean ones, and the ones put in from here today
  // while they're still in the basket (once washed they've moved on, so they drop out).
  const movedIds = new Set(outfit ? outfit.movedIds : item!.inWashFromToday ? [item!.itemId] : []);
  const canTick = (id: string, status: ClothingStatus) => status === "clean" || (status === "wash" && movedIds.has(id));
  const statusOf = (id: string, status: ClothingStatus) => ticked.get(id) ?? (status === "wash" && movedIds.has(id));
  const choices = outfit ? outfit.pieces.filter((p) => canTick(p.id, p.status)) : [];
  const itemChoice = item !== null && canTick(item.itemId, item.status) ? item : null;
  const stillClean = choices.filter((p) => !statusOf(p.id, p.status));

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-2">
      <div className="flex items-center justify-between gap-3 pl-2">
        <span className="text-foreground">✓ Worn today</span>
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

      {itemChoice && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface py-1 pr-1 pl-3">
          <span className="text-foreground">Into the wash</span>
          <SheepCheckbox
            checked={statusOf(itemChoice.itemId, itemChoice.status)}
            label="Into the wash"
            onChange={() => toggle([itemChoice.itemId], !statusOf(itemChoice.itemId, itemChoice.status))}
          />
        </div>
      )}

      {choices.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex min-h-11 items-center justify-between gap-3 pl-2">
            <span className="text-sm text-ink-muted">Into the wash? The rest stay clean.</span>
            {stillClean.length > 1 && (
              <button
                type="button"
                onClick={() => toggle(stillClean.map((p) => p.id), true)}
                className="btn btn-ghost inline-flex min-h-11 shrink-0 px-3 text-sm"
              >
                All of them
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-1">
            {choices.map((p) => {
              const inWash = statusOf(p.id, p.status);
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-surface p-1 pl-1">
                  <ItemPhoto photoId={p.photoId} cutout={p.photoCutout} name={p.name} className="h-11 w-11 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{p.name}</span>
                    <span className="block text-sm text-ink-muted">
                      {inWash ? "In the wash" : "Clean"}
                      {p.washGroup === "white" && " · white"}
                    </span>
                  </span>
                  <SheepCheckbox
                    checked={inWash}
                    label={`${p.name} into the wash`}
                    onChange={() => toggle([p.id], !inWash)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
