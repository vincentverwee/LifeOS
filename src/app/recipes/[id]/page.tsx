import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSavedRecipe } from "@/lib/data/recipes";
import { getTodayKey } from "@/lib/today";
import { RecipeBody, RecipeMeta } from "@/components/recipes/RecipeBody";
import { RecipeActions } from "@/components/recipes/RecipeActions";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const [recipe, todayKey] = await Promise.all([getSavedRecipe(id), getTodayKey()]);
  if (!recipe) notFound();

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/recipes/saved" className="-mb-2 self-start text-sm font-medium text-ink-muted hover:text-foreground">
        ‹ Saved recipes
      </Link>

      {recipe.image && (
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl bg-surface-muted">
          <Image src={recipe.image} alt="" fill sizes="(min-width: 672px) 672px, 100vw" className="object-cover" priority />
        </div>
      )}

      <div>
        <h1 className="text-2xl leading-tight font-semibold text-foreground">{recipe.title}</h1>
        <RecipeMeta readyInMinutes={recipe.readyInMinutes} servings={recipe.servings} className="mt-2" />
        {recipe.cuisines.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {recipe.cuisines.map((c) => (
              <li key={c} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-primary">
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      <RecipeActions id={recipe.id} madeOn={recipe.madeOn} todayKey={todayKey} />

      {recipe.summary && <p className="leading-relaxed text-ink-muted">{recipe.summary}</p>}

      <RecipeBody ingredients={recipe.ingredients} steps={recipe.steps} />

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Original recipe ↗
        </a>
      )}
    </article>
  );
}
