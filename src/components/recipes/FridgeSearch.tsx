"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { searchFridge, type FridgeSearchResult } from "@/lib/actions/recipes";
import { FridgeResults } from "./FridgeResults";

const listKey = (names: string[]) => [...names].sort().join(",");

/** The "Find recipes" button and its results. Searching is explicit, so editing the list is free. */
export function FridgeSearch({ pantryNames }: { pantryNames: string[] }) {
  const [result, setResult] = useState<FridgeSearchResult | null>(null);
  const [searchId, setSearchId] = useState(0);
  const [pending, startTransition] = useTransition();

  function search() {
    startTransition(async () => {
      const next = await searchFridge().catch(() => ({ ok: false as const, error: "Couldn't search recipes." }));
      setResult(next);
      setSearchId((id) => id + 1);
    });
  }

  const changed = result?.ok === true && listKey(result.searched) !== listKey(pantryNames);
  const empty = pantryNames.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={search}
          disabled={pending || empty}
          className="btn btn-primary flex min-h-12 w-full px-5 font-semibold"
        >
          <Search size={18} aria-hidden="true" />
          {pending ? "Searching…" : result?.ok ? "Search again" : "Find recipes"}
        </button>
        {empty && <p className="text-center text-sm text-ink-muted">Add a few ingredients, then search.</p>}
        {changed && !pending && (
          <p className="text-center text-sm text-warning-text">Your ingredients changed. Search again to update.</p>
        )}
      </div>

      {result &&
        (result.ok ? (
          // Keyed per search so saved hearts and the open sheet reset with new results.
          <FridgeResults key={searchId} matches={result.matches} savedIds={result.savedIds} />
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-critical">{result.error}</p>
        ))}
    </div>
  );
}
