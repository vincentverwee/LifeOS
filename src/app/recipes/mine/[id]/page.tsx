import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyRecipe } from "@/lib/data/recipes";
import { getTodayKey } from "@/lib/today";
import { RecipeBody, RecipeMeta } from "@/components/recipes/RecipeBody";
import { MyRecipeActions } from "@/components/recipes/MyRecipeActions";

export default async function MyRecipePage({ params }: PageProps<"/recipes/mine/[id]">) {
  const { id } = await params;
  const [recipe, todayKey] = await Promise.all([getMyRecipe(id), getTodayKey()]);
  if (!recipe) notFound();

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/recipes"
        className="btn -mx-3 -mb-2 inline-flex min-h-11 self-start px-3 text-sm text-ink-muted hover:bg-surface-muted hover:text-foreground active:bg-surface-muted"
      >
        ‹ Cookbook
      </Link>

      <header>
        <h1 className="text-2xl leading-tight font-semibold text-foreground">{recipe.title}</h1>
        <RecipeMeta readyInMinutes={recipe.readyInMinutes} servings={recipe.servings} className="mt-2" />
        {recipe.mealType && (
          <p className="mt-3 inline-block rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
            {recipe.mealType}
          </p>
        )}
      </header>

      <MyRecipeActions id={recipe.id} lastMadeOn={recipe.lastMadeOn} todayKey={todayKey} />

      <RecipeBody
        ingredients={recipe.ingredients.map((line) => ({ name: line, amount: 0, unit: "", original: line }))}
        steps={recipe.steps}
      />

      {recipe.notes && (
        <section>
          <h3 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">Notes</h3>
          <p className="mt-2 leading-relaxed whitespace-pre-line text-foreground">{recipe.notes}</p>
        </section>
      )}

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm"
        >
          Original recipe ↗
        </a>
      )}
    </article>
  );
}
