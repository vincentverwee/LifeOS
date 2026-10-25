import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { getSavedRecipes, type SavedRecipeSummary } from "@/lib/data/recipes";
import { formatDate } from "@/lib/format";

export default async function SavedRecipesPage() {
  await connection();
  const { toMake, made } = await getSavedRecipes();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold text-foreground">To make</h1>
        {toMake.length > 0 ? (
          <RecipeList recipes={toMake} />
        ) : (
          <p className="mt-3 text-ink-muted">
            Nothing saved yet.{" "}
            <Link href="/recipes" className="font-medium text-primary underline-offset-2 hover:underline">
              Start swiping
            </Link>
          </p>
        )}
      </section>

      {made.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground">Made</h2>
          <RecipeList recipes={made} />
        </section>
      )}
    </div>
  );
}

function RecipeList({ recipes }: { recipes: SavedRecipeSummary[] }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link
            href={`/recipes/${recipe.id}`}
            className="flex h-full items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 transition-colors hover:border-primary active:bg-surface-muted"
          >
            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
              {recipe.image && <Image src={recipe.image} alt="" fill sizes="80px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 leading-snug font-medium text-foreground">{recipe.title}</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {recipe.madeOn
                  ? `Made ${formatDate(recipe.madeOn)}`
                  : recipe.readyInMinutes !== null && `⏱ ${recipe.readyInMinutes} min`}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
