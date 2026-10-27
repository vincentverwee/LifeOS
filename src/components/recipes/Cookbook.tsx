"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { MyRecipeSummary } from "@/lib/data/recipes";
import { MEAL_TYPES } from "@/lib/recipes/types";
import { formatDate } from "@/lib/format";
import { Chip } from "./Chip";

/** Cookbook list with a search (name or ingredient) and meal chips; all filtering happens here. */
export function Cookbook({ recipes }: { recipes: MyRecipeSummary[] }) {
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState<string | null>(null);

  const meals = MEAL_TYPES.filter((t) => recipes.some((r) => r.mealType === t));
  const q = query.trim().toLowerCase();
  const shown = recipes.filter(
    (r) =>
      (!meal || r.mealType === meal) &&
      (!q || r.title.toLowerCase().includes(q) || r.ingredients.some((line) => line.toLowerCase().includes(q)))
  );

  return (
    <div className="flex flex-col gap-4">
      <label className="relative">
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or ingredient"
          aria-label="Search your recipes"
          enterKeyHint="search"
          className="min-h-12 w-full rounded-full border border-border bg-surface pr-4 pl-11 text-foreground"
        />
      </label>

      {meals.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Chip selected={!meal} onClick={() => setMeal(null)}>
            All
          </Chip>
          {meals.map((t) => (
            <Chip key={t} selected={meal === t} onClick={() => setMeal(meal === t ? null : t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}

      {shown.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/mine/${recipe.id}`}
                className="tap flex h-full items-center gap-3 rounded-2xl border border-border bg-surface p-2.5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-xl font-semibold text-primary"
                >
                  {recipe.title.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 leading-snug font-medium text-foreground">{recipe.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {[
                      recipe.readyInMinutes !== null && `⏱ ${recipe.readyInMinutes} min`,
                      recipe.lastMadeOn && `Made ${formatDate(recipe.lastMadeOn)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-ink-muted">No recipes match.</p>
      )}
    </div>
  );
}
