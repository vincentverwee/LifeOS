"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { animate, motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from "framer-motion";
import { Heart, Info, X } from "lucide-react";
import { likeRecipe } from "@/lib/actions/recipes";
import { deckQuery, type DeckFilters, type DeckResult, type RecipeCard, type RecipeIngredient } from "@/lib/recipes/types";

/** GET /api/recipes/deck: doesn't queue behind likes like a server action would. */
async function loadDeck(filters: DeckFilters): Promise<DeckResult> {
  const res = await fetch(`/api/recipes/deck?${deckQuery(filters)}`, { cache: "no-store" });
  if (res.status === 401 || res.redirected) return { ok: false, error: "Your session expired. Reload to log in." };
  return (await res.json()) as DeckResult;
}
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

export function SwipeDeck({ filters }: { filters: DeckFilters }) {
  const [cards, setCards] = useState<RecipeCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quotaLeft, setQuotaLeft] = useState<number | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Cards already shown this visit, so a new random batch doesn't repeat them.
  // Left swipes aren't stored anywhere else, so they can come back another day.
  const seen = useRef(new Set<number>());
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
        if (result.quotaLeft !== null) setQuotaLeft(result.quotaLeft);
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
      <div className="relative h-[clamp(320px,calc(100svh-21rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)),600px)] w-full max-w-sm">
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
          className="btn btn-danger flex h-16 w-16 shadow-sm"
        >
          <X size={30} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => swipe("right")}
          disabled={!top}
          aria-label="Want to make"
          className="btn btn-primary flex h-16 w-16 shadow-sm"
        >
          <Heart size={28} strokeWidth={2.5} fill="currentColor" aria-hidden="true" />
        </button>
      </div>

      {quotaLeft !== null && (
        <p className="mt-3 text-xs text-ink-muted">{Math.max(0, Math.floor(quotaLeft))} recipe points left today</p>
      )}

      {top && (
        <Sheet open={infoOpen} onOpenChange={setInfoOpen} title={top.title}>
          <RecipeMeta readyInMinutes={top.readyInMinutes} servings={top.servings} className="mb-4" />
          <RecipeBody ingredients={top.ingredients} steps={top.steps} />
          {top.summary && <p className="mt-6 text-sm leading-relaxed text-ink-muted line-clamp-4">{top.summary}</p>}
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
  const { main, staples } = splitIngredients(card.ingredients);

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
      {isTop && (
        <>
          <motion.span
            style={{ opacity: likeOpacity }}
            className="pointer-events-none absolute top-5 left-5 z-10 -rotate-12 rounded-2xl border-4 border-good bg-surface/90 px-3 py-1 text-2xl font-extrabold tracking-wider text-good"
          >
            YUM
          </motion.span>
          <motion.span
            style={{ opacity: nopeOpacity }}
            className="pointer-events-none absolute top-5 right-5 z-10 rotate-12 rounded-2xl border-4 border-critical bg-surface/90 px-3 py-1 text-2xl font-extrabold tracking-wider text-critical"
          >
            NOPE
          </motion.span>
        </>
      )}

      <header className="flex items-start gap-3 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-3 text-xl leading-snug font-semibold text-foreground">{card.title}</h2>
          <RecipeMeta readyInMinutes={card.readyInMinutes} servings={card.servings} className="mt-1.5" />
        </div>
        {card.image && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-surface-muted">
            <Image
              src={card.image}
              alt=""
              fill
              sizes="64px"
              className="pointer-events-none object-cover"
              draggable={false}
            />
          </div>
        )}
      </header>

      <section className="flex min-h-0 flex-1 flex-col px-4 pt-3">
        <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {main.length + staples.length} ingredients
        </h3>
        {/* Fades out at the bottom when the list is longer than the card; the full list is behind "Full recipe". */}
        <ul className="mt-2 flex min-h-0 flex-1 flex-wrap content-start gap-1.5 overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
          {main.map((name) => (
            <li key={name} className="rounded-full bg-surface-muted px-3 py-1 text-sm font-medium text-foreground first-letter:uppercase">
              {name}
            </li>
          ))}
          {staples.map((name) => (
            <li key={name} className="rounded-full border border-border px-3 py-1 text-sm text-ink-muted first-letter:uppercase">
              {name}
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex items-center gap-2 p-3 pl-4">
        <ul className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
          {card.cuisines.slice(0, 2).map((c) => (
            <li key={c} className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-primary">
              {c}
            </li>
          ))}
        </ul>
        {isTop && (
          <button
            type="button"
            onClick={onInfo}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="btn btn-outline inline-flex min-h-11 shrink-0 gap-1.5 px-4 text-sm"
          >
            <Info size={16} aria-hidden="true" />
            Full recipe
          </button>
        )}
      </footer>
    </motion.article>
  );
}

// Pantry basics are listed last and muted, so the ingredients that define the dish stand out.
const STAPLES = new Set([
  "salt",
  "pepper",
  "black pepper",
  "salt and pepper",
  "water",
  "olive oil",
  "oil",
  "vegetable oil",
  "canola oil",
  "butter",
  "sugar",
  "flour",
  "all purpose flour",
  "ice",
]);

/** Unique ingredient names, the defining ones first and pantry staples after. */
function splitIngredients(ingredients: RecipeIngredient[]): { main: string[]; staples: string[] } {
  const names = [...new Set(ingredients.map((i) => i.name.trim().toLowerCase()).filter(Boolean))];
  return {
    main: names.filter((n) => !STAPLES.has(n)),
    staples: names.filter((n) => STAPLES.has(n)),
  };
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
            className="btn btn-outline min-h-11 px-5 text-sm"
          >
            Try again
          </button>
          <Link
            href="/recipes/saved"
            className="btn btn-primary flex min-h-11 px-5 text-sm"
          >
            Saved recipes
          </Link>
        </div>
      )}
    </div>
  );
}
