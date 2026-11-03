"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { WashingMachine } from "lucide-react";
import { moveItems } from "@/lib/actions/wardrobe";
import type { ClothingStatus } from "@/lib/wardrobe/types";
import { SheepCheckbox } from "@/components/reminders/SheepCheckbox";
import { SLIDE_OUT_MS, SlideRow, wait } from "@/components/reminders/SlideRow";
import { ItemPhoto } from "./ItemPhoto";

type Item = {
  id: string;
  name: string;
  categoryName: string;
  status: ClothingStatus;
  photoId: string | null;
  photoCutout: boolean;
};

type Step = {
  from: ClothingStatus;
  to: ClothingStatus;
  done: string;
  all: string;
  hint: string;
};

/** What a tick does in each list. */
const STEPS: Record<ClothingStatus, Step> = {
  wash: {
    from: "wash",
    to: "drying",
    done: "Washed",
    all: "All washed",
    hint: "Tick the sheep once it's washed.",
  },
  drying: {
    from: "drying",
    to: "clean",
    done: "Dry",
    all: "All dry",
    hint: "Tick the sheep once it's dry.",
  },
  clean: { from: "clean", to: "wash", done: "In the wash", all: "", hint: "" },
};

type Undo = { label: string; ids: string[]; step: Step };

/** Over this many clean items the "Put in the wash" list gets a search box. */
const SEARCH_FROM = 8;

function Row({
  item,
  leaving,
  returning,
  action,
}: {
  item: Item;
  leaving: boolean;
  returning: boolean;
  action: React.ReactNode;
}) {
  return (
    <SlideRow leaving={leaving ? "right" : null} entering={returning}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2">
        <Link
          href={`/wardrobe/items/${item.id}`}
          className="tap flex min-w-0 flex-1 items-center gap-3 rounded-xl"
        >
          <ItemPhoto
            photoId={item.photoId}
            cutout={item.photoCutout}
            name={item.name}
            className="h-14 w-14 shrink-0 rounded-xl"
          />
          <span className="min-w-0">
            <span
              className={`block truncate font-medium text-foreground ${leaving ? "line-through" : ""}`}
            >
              {item.name}
            </span>
            <span className="block truncate text-sm text-ink-muted">
              {item.categoryName}
            </span>
          </span>
        </Link>
        {action}
      </div>
    </SlideRow>
  );
}

/**
 * The basket (in the wash), the rack (drying) and, folded away, the clean clothes to put in.
 * A tick slides the row off and moves the item one step on; "Undo" stays for a few seconds.
 */
export function WashBoard({ items }: { items: Item[] }) {
  // Rows stay ticked until the action's re-render moves them to their next list.
  const [leaving, addLeaving] = useOptimistic<ReadonlySet<string>, string[]>(
    new Set(),
    (prev, ids) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    },
  );
  const [undo, setUndo] = useState<Undo | null>(null);
  const [returning, setReturning] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Kept here, not in the DOM: the list re-renders after every move and an Undo, and must stay open.
  const [basketOpen, setBasketOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);

  function move(list: Item[], step: Step) {
    const ids = list.map((i) => i.id);
    setError(null);
    setReturning(new Set());
    startTransition(async () => {
      addLeaving(ids);
      try {
        await Promise.all([
          moveItems(ids, step.from, step.to),
          wait(SLIDE_OUT_MS),
        ]);
        setUndo({
          label:
            list.length === 1
              ? `${step.done}: ${list[0].name}`
              : `${step.done}: ${list.length} items`,
          ids,
          step,
        });
      } catch {
        setError("Couldn't save that. Check your connection and try again.");
      }
    });
  }

  function undoMove(target: Undo) {
    setUndo(null);
    setReturning(new Set(target.ids));
    startTransition(async () => {
      try {
        await moveItems(target.ids, target.step.to, target.step.from);
      } catch {
        setError("Couldn't undo that. Check your connection and try again.");
      }
    });
  }

  const wash = items.filter((i) => i.status === "wash");
  const drying = items.filter((i) => i.status === "drying");
  const clean = items.filter((i) => i.status === "clean");
  const q = query.trim().toLowerCase();
  const cleanShown = q
    ? clean.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.categoryName.toLowerCase().includes(q),
      )
    : clean;

  const section = (title: string, list: Item[], step: Step, empty: string) => {
    const open = list.filter((i) => !leaving.has(i.id));
    return (
      <section className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {title}{" "}
              <span className="text-base font-normal text-ink-muted tabular-nums">
                {open.length}
              </span>
            </h2>
            {open.length > 0 && (
              <p className="text-sm text-ink-muted">{step.hint}</p>
            )}
          </div>
          {open.length > 1 && (
            <button
              type="button"
              onClick={() => move(open, step)}
              className="btn btn-ghost inline-flex min-h-11 px-3 text-sm"
            >
              {step.all}
            </button>
          )}
        </div>
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-sm text-ink-muted">
            {empty}
          </p>
        ) : (
          <ul className="flex flex-col">
            {list.map((item) => (
              <Row
                key={item.id}
                item={item}
                leaving={leaving.has(item.id)}
                returning={returning.has(item.id)}
                action={
                  <SheepCheckbox
                    checked={leaving.has(item.id)}
                    disabled={leaving.has(item.id)}
                    label={`${step.done}: ${item.name}`}
                    onChange={() => move([item], step)}
                  />
                }
              />
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    // Clips the sliding rows at the screen edge (-mx-4 px-4 = the page gutter): body's
    // overflow-x clip goes to the viewport, and a mobile viewport still widens mid-slide.
    <div className="-mx-4 flex flex-col gap-6 overflow-x-clip px-4 sm:-mx-6 sm:px-6">
      {section("In the wash", wash, STEPS.wash, "Nothing in the basket.")}
      {section("Drying", drying, STEPS.drying, "Nothing drying.")}

      {/* Floats above the tab bar, so it's in view wherever the tick was. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md flex-col gap-2 px-4 sm:bottom-6"
      >
        {undo && (
          <p className="pointer-events-auto flex items-center justify-between gap-3 rounded-full border border-border bg-surface py-1 pr-1 pl-4 text-sm text-foreground shadow-lg">
            <span className="min-w-0 truncate">✓ {undo.label}</span>
            <button
              type="button"
              onClick={() => undoMove(undo)}
              className="btn btn-ghost inline-flex min-h-11 shrink-0 px-4 font-semibold"
            >
              Undo
            </button>
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

      <details
        open={basketOpen}
        onToggle={(e) => setBasketOpen(e.currentTarget.open)}
        className="group rounded-2xl border border-border bg-surface px-4 py-1"
      >
        <summary className="tap -mx-4 flex min-h-12 cursor-pointer list-none items-center justify-between rounded-2xl px-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
          <span>
            Put in the wash{" "}
            <span className="font-normal text-ink-muted tabular-nums">
              · {clean.length} clean
            </span>
          </span>
          <span
            aria-hidden="true"
            className="text-ink-muted transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="mt-2 mb-3 flex flex-col gap-2">
          {clean.length > SEARCH_FROM && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clean clothes"
              aria-label="Search clean clothes"
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
            />
          )}
          {clean.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-muted">
              Everything is in the wash or drying.
            </p>
          ) : cleanShown.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-muted">
              Nothing matches “{query}”.
            </p>
          ) : (
            <ul className="flex flex-col">
              {cleanShown.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  leaving={leaving.has(item.id)}
                  returning={returning.has(item.id)}
                  action={
                    <button
                      type="button"
                      disabled={leaving.has(item.id)}
                      onClick={() => move([item], STEPS.clean)}
                      aria-label={`Put ${item.name} in the wash`}
                      className="btn btn-outline flex min-h-11 shrink-0 items-center gap-1.5 px-3 text-sm"
                    >
                      <WashingMachine size={18} aria-hidden="true" />
                      Wash
                    </button>
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </details>
      {/* Room for the floating Undo bar, so it never covers the last row. */}
      {(undo || error) && <div aria-hidden="true" className="h-12" />}
    </div>
  );
}
