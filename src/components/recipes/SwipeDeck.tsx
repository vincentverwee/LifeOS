"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { animate, motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from "framer-motion";
import { Heart, Info, X } from "lucide-react";
import { likeRecipe, loadDeck } from "@/lib/actions/recipes";
import type { DeckFilters, RecipeCard } from "@/lib/recipes/types";
import { RecipeBody, RecipeMeta } from "./RecipeBody";
import { Sheet } from "./Sheet";

type Direction = "left" | "right";

/** Past this drag distance (px) or fling speed (px/s), a release commits the swipe. */
const SWIPE_DISTANCE = 120;
const SWIPE_VELOCITY = 600;
/** Fetch the next batch once fewer cards than this are left. */
const REFILL_AT = 3;
/** Give up after this many batches in a row bring nothing new. */
const MAX_EMPTY_BATCHES = 2;

export function SwipeDeck({
  filters,
  initialCards,
  initialError,
}: {
  filters: DeckFilters;
  initialCards: RecipeCard[];
  initialError: string | null;
}) {
  const [cards, setCards] = useState(initialCards);
  const [error, setError] = useState(initialError);
  const [exhausted, setExhausted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Cards already shown this visit, so a new random batch doesn't repeat them.
  // Left swipes aren't stored anywhere else, so they can come back another day.
  const seen = useRef(new Set(initialCards.map((c) => c.id)));
  const swiping = useRef(false);
  const fetching = useRef(false);

  const x = useMotionValue(0);
  const top = cards[0];

  // The departing card is gone once React renders the next top card; only then
  // put the shared drag offset back, so the old card never flashes at centre.
  useLayoutEffect(() => {
    x.set(0);
    swiping.current = false;
  }, [top?.id, x]);

  const refill = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      // A random batch can be all repeats; try a couple more before giving up.
      for (let attempt = 0; attempt < MAX_EMPTY_BATCHES; attempt++) {
        const result = await loadDeck(filters).catch(() => ({ ok: false as const, error: "Couldn't load recipes." }));
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const fresh = result.cards.filter((c) => !seen.current.has(c.id));
        if (fresh.length > 0) {
          fresh.forEach((c) => seen.current.add(c.id));
          setCards((current) => [...current, ...fresh]);
          return;
        }
      }
      setExhausted(true);
    } finally {
      fetching.current = false;
    }
  }, [filters]);

  useEffect(() => {
    if (cards.length < REFILL_AT && !error && !exhausted) void refill();
  }, [cards.length, error, exhausted, refill]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const swipe = useCallback(
    (direction: Direction) => {
      const card = cards[0];
      if (!card || swiping.current) return;
      swiping.current = true;
      setInfoOpen(false);

      if (direction === "right") {
        likeRecipe(card).then(
          (result) => !result.ok && setToast(result.error),
          () => setToast("Couldn't save that recipe."),
        );
      }

      const distance = (typeof window === "undefined" ? 500 : window.innerWidth) * 1.2;
      animate(x, direction === "right" ? distance : -distance, { duration: 0.25, ease: "easeIn" }).then(() =>
        setCards((current) => current.filter((c) => c.id !== card.id)),
      );
    },
    [cards, x],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (infoOpen || event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") swipe("left");
      if (event.key === "ArrowRight") swipe("right");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe, infoOpen]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) swipe("right");
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) swipe("left");
    else animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
  }

  function retry() {
    setError(null);
    setExhausted(false);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[clamp(360px,calc(100svh-21rem),600px)] w-full max-w-sm">
        {top ? (
          cards
            .slice(0, 3)
            .map((card, depth) => (
              <DeckCard
                key={card.id}
                card={card}
                depth={depth}
                x={x}
                onDragEnd={onDragEnd}
                onInfo={() => setInfoOpen(true)}
              />
            ))
            .reverse()
        ) : (
          <EmptyDeck error={error} exhausted={exhausted} onRetry={retry} />
        )}
      </div>

      <div className="mt-4 flex items-center gap-8">
        <button
          type="button"
          onClick={() => swipe("left")}
          disabled={!top}
          aria-label="Skip"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-critical shadow-sm transition-transform active:scale-90 disabled:opacity-40"
        >
          <X size={30} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => swipe("right")}
          disabled={!top}
          aria-label="Want to make"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-90 disabled:opacity-40"
        >
          <Heart size={28} strokeWidth={2.5} fill="currentColor" aria-hidden="true" />
        </button>
      </div>

      {top && (
        <Sheet open={infoOpen} onOpenChange={setInfoOpen} title={top.title}>
          <RecipeMeta readyInMinutes={top.readyInMinutes} servings={top.servings} className="mb-4" />
          {top.summary && <p className="mb-6 text-sm leading-relaxed text-ink-muted line-clamp-4">{top.summary}</p>}
          <RecipeBody ingredients={top.ingredients} steps={top.steps} />
        </Sheet>
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg sm:bottom-6"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function DeckCard({
  card,
  depth,
  x,
  onDragEnd,
  onInfo,
}: {
  card: RecipeCard;
  /** 0 = the top card you swipe, 1–2 = peeking underneath. */
  depth: number;
  x: MotionValue<number>;
  onDragEnd: (event: unknown, info: PanInfo) => void;
  onInfo: () => void;
}) {
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);
  const isTop = depth === 0;

  return (
    <motion.article
      className="absolute inset-0 flex cursor-grab touch-pan-y flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-lg select-none active:cursor-grabbing"
      style={isTop ? { x, rotate } : undefined}
      animate={{ scale: 1 - depth * 0.04, y: depth * 12 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      drag={isTop ? "x" : false}
      dragMomentum={false}
      onDragEnd={isTop ? onDragEnd : undefined}
      aria-hidden={!isTop}
    >
      <div className="relative h-3/5 shrink-0 bg-surface-muted">
        {card.image && (
          <Image
            src={card.image}
            alt=""
            fill
            sizes="(min-width: 640px) 384px, 100vw"
            className="pointer-events-none object-cover"
            draggable={false}
            priority={isTop}
          />
        )}
        {isTop && (
          <>
            <motion.span
              style={{ opacity: likeOpacity }}
              className="absolute top-6 left-5 -rotate-12 rounded-lg border-4 border-good bg-surface/80 px-3 py-1 text-2xl font-extrabold tracking-wider text-good"
            >
              YUM
            </motion.span>
            <motion.span
              style={{ opacity: nopeOpacity }}
              className="absolute top-6 right-5 rotate-12 rounded-lg border-4 border-critical bg-surface/80 px-3 py-1 text-2xl font-extrabold tracking-wider text-critical"
            >
              NOPE
            </motion.span>
            <button
              type="button"
              onClick={onInfo}
              onPointerDownCapture={(e) => e.stopPropagation()}
              aria-label="Ingredients and steps"
              className="absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow"
            >
              <Info size={22} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 text-xl leading-snug font-semibold text-foreground">{card.title}</h2>
        <RecipeMeta readyInMinutes={card.readyInMinutes} servings={card.servings} />
        {card.cuisines.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5">
            {card.cuisines.slice(0, 3).map((c) => (
              <li key={c} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-primary">
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.article>
  );
}

function EmptyDeck({
  error,
  exhausted,
  onRetry,
}: {
  error: string | null;
  exhausted: boolean;
  onRetry: () => void;
}) {
  let message = "Finding recipes…";
  if (error) message = error;
  else if (exhausted) message = "No more recipes match these filters.";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border p-6 text-center">
      <p className={error ? "text-critical" : "text-ink-muted"}>{message}</p>
      {(error || exhausted) && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Try again
          </button>
          <Link
            href="/recipes/saved"
            className="flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Saved recipes
          </Link>
        </div>
      )}
    </div>
  );
}
