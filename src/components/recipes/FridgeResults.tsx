"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { getRecipeInfo, likeRecipe } from "@/lib/actions/recipes";
import type { FridgeMatch, RecipeCard } from "@/lib/recipes/types";
import { RecipeBody, RecipeMeta } from "./RecipeBody";
import { Sheet } from "./Sheet";

/** Fridge matches grouped by how much you'd still need to buy. */
export function FridgeResults({ matches, savedIds }: { matches: FridgeMatch[]; savedIds: number[] }) {
  const [saved, setSaved] = useState(() => new Set(savedIds));
  const [savingId, setSavingId] = useState<number | null>(null);
  const [open, setOpen] = useState<FridgeMatch | null>(null);
  const [details, setDetails] = useState<RecipeCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Full recipes fetched this visit, so opening and then saving costs one API call.
  const [cache] = useState(() => new Map<number, RecipeCard>());

  async function loadCard(id: number): Promise<RecipeCard | string> {
    const cached = cache.get(id);
    if (cached) return cached;
    const result = await getRecipeInfo(id);
    if (!result.ok) return result.error;
    cache.set(id, result.card);
    return result.card;
  }

  async function openMatch(match: FridgeMatch) {
    setOpen(match);
    setDetails(null);
    setError(null);
    const card = await loadCard(match.id);
    if (typeof card === "string") setError(card);
    else setDetails(card);
  }

  async function save(match: FridgeMatch) {
    if (saved.has(match.id) || savingId !== null) return;
    setSavingId(match.id);
    setError(null);
    const card = await loadCard(match.id);
    const result = typeof card === "string" ? { ok: false as const, error: card } : await likeRecipe(card);
    setSavingId(null);
    if (result.ok) setSaved((current) => new Set(current).add(match.id));
    else setError(result.error);
  }

  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-ink-muted">
        No recipes found with these ingredients. Try adding a few more.
      </p>
    );
  }

  const makeNow = matches.filter((m) => m.missing.length === 0);
  const buyFew = matches.filter((m) => m.missing.length >= 1 && m.missing.length <= 2);
  const needsMore = matches.filter((m) => m.missing.length > 2);

  const list = (items: FridgeMatch[]) => (
    <ul className="mt-3 flex flex-col gap-2">
      {items.map((match) => (
        <li key={match.id}>
          <MatchRow
            match={match}
            saved={saved.has(match.id)}
            saving={savingId === match.id}
            onOpen={() => openMatch(match)}
            onSave={() => save(match)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-8">
      {error && !open && <p className="text-sm text-critical">{error}</p>}

      <section>
        <h2 className="text-xl font-semibold text-foreground">Make now</h2>
        {makeNow.length > 0 ? (
          list(makeNow)
        ) : (
          <p className="mt-2 text-sm text-ink-muted">Nothing you can make with only these yet.</p>
        )}
      </section>

      {buyFew.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground">Buy 1–2 things</h2>
          {list(buyFew)}
        </section>
      )}

      {needsMore.length > 0 && (
        <details className="group">
          <summary className="btn btn-ghost -mx-3 inline-flex min-h-11 cursor-pointer list-none px-3 text-sm">
            {needsMore.length} more that need 3+ things
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">
              ⌄
            </span>
          </summary>
          {list(needsMore)}
        </details>
      )}

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)} title={open?.title ?? ""}>
        {open && (
          <div className="flex flex-col gap-5">
            {open.missing.length > 0 && (
              <div className="rounded-2xl bg-surface-muted p-3">
                <p className="text-sm font-semibold text-foreground">You&apos;d need to buy</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {open.missing.map((name) => (
                    <li key={name} className="rounded-full border border-critical/40 px-3 py-1 text-sm text-critical first-letter:uppercase">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error ? (
              <p className="text-critical">{error}</p>
            ) : details ? (
              <>
                <RecipeMeta readyInMinutes={details.readyInMinutes} servings={details.servings} />
                <RecipeBody ingredients={details.ingredients} steps={details.steps} />
              </>
            ) : (
              <p className="text-ink-muted">Loading recipe…</p>
            )}
            <button
              type="button"
              onClick={() => save(open)}
              disabled={saved.has(open.id) || savingId !== null}
              className="btn btn-primary sticky bottom-0 flex min-h-12 font-semibold"
            >
              <Heart size={18} aria-hidden="true" fill={saved.has(open.id) ? "currentColor" : "none"} />
              {saved.has(open.id) ? "Saved" : savingId === open.id ? "Saving…" : "Save to want-to-make"}
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function MatchRow({
  match,
  saved,
  saving,
  onOpen,
  onSave,
}: {
  match: FridgeMatch;
  saved: boolean;
  saving: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border bg-surface p-2">
      <button type="button" onClick={onOpen} className="tap flex min-w-0 flex-1 items-start gap-3 rounded-xl p-1 text-left">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
          {match.image && <Image src={match.image} alt="" fill sizes="56px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 leading-snug font-medium text-foreground">{match.title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Uses {match.used.length} of yours{match.missing.length > 0 && ` · needs ${match.missing.length} more`}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1">
            {match.missing.map((name) => (
              <li key={`m-${name}`} className="rounded-full border border-critical/40 px-2 py-0.5 text-xs text-critical">
                + {name}
              </li>
            ))}
            {match.used.map((name) => (
              <li key={`u-${name}`} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saved || saving}
        aria-label={saved ? "Saved" : "Save to want-to-make"}
        aria-pressed={saved}
        className={`btn flex h-11 w-11 shrink-0 hover:bg-surface-muted active:bg-surface-muted ${
          saved ? "text-primary disabled:opacity-100" : "text-ink-muted"
        }`}
      >
        <Heart size={22} aria-hidden="true" fill={saved ? "currentColor" : "none"} className={saving ? "animate-pulse" : ""} />
      </button>
    </div>
  );
}
