import { loadDeck } from "@/lib/actions/recipes";
import { parseDeckFilters } from "@/lib/recipes/types";
import { DeckFilters } from "@/components/recipes/DeckFilters";
import { SwipeDeck } from "@/components/recipes/SwipeDeck";

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const filters = parseDeckFilters(await searchParams);
  const deck = await loadDeck(filters);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <DeckFilters filters={filters} />
      {/* Keyed so new filters start a fresh deck. */}
      <SwipeDeck
        key={JSON.stringify(filters)}
        filters={filters}
        initialCards={deck.ok ? deck.cards : []}
        initialError={deck.ok ? null : deck.error}
      />
    </div>
  );
}
