import { connection } from "next/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { getIngredientSuggestions, getPantry } from "@/lib/data/recipes";
import { PantryEditor } from "@/components/recipes/PantryEditor";
import { FridgeSearch } from "@/components/recipes/FridgeSearch";

// No API call here: the search only runs when "Find recipes" is pressed (see FridgeSearch),
// so adding or removing ingredients, which re-renders this page, costs no quota.
export default async function FridgePage() {
  await connection();
  const [pantry, suggestions] = await Promise.all([getPantry(), getIngredientSuggestions()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="What can I make?"
        subtitle="Add everything you have, then search. Basics like salt, oil and flour are assumed."
        back={{ href: "/recipes", label: "Recipes" }}
      />

      <PantryEditor pantry={pantry} suggestions={suggestions} />
      <FridgeSearch pantryNames={pantry.map((p) => p.name)} />
    </div>
  );
}
