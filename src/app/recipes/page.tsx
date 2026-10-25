import { parseDeckFilters } from "@/lib/recipes/types";
import { DeckFilters } from "@/components/recipes/DeckFilters";
import { SwipeDeck } from "@/components/recipes/SwipeDeck";

// The deck loads its cards from the browser (see SwipeDeck), never here: server actions that
// revalidate (like saving a recipe) re-render this page, and every render would spend API quota.
export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const filters = parseDeckFilters(await searchParams);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <DeckFilters filters={filters} />
      {/* Keyed so new filters start a fresh deck. */}
      <SwipeDeck key={JSON.stringify(filters)} filters={filters} />
    </div>
  );
}
